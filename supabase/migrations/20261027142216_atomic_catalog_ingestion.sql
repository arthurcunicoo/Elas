-- Atomic, service-only catalog import. Deploy after staging and drain old workers.
create table private.catalog_ingest_receipts (
 lease uuid primary key, batch_hash text not null, counts jsonb not null,
 created_at timestamptz not null default now()
);
create index catalog_ingest_receipts_age on private.catalog_ingest_receipts(created_at,lease);
alter table private.catalog_ingest_receipts enable row level security;
revoke all on private.catalog_ingest_receipts from public,anon,authenticated,service_role;

create function private.confirmar_catalogo_ingestao(p_lease uuid,p_batch jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 tile private.catalog_tiles; prior public.lugares; saved public.lugares; r jsonb; metadata public.lugares_fontes;
 receipt private.catalog_ingest_receipts; batch_hash text; collected timestamptz; result jsonb;
 received integer; rejected integer; discarded integer; made integer:=0; changed integer:=0;
 unchanged integer:=0; manual_preserved integer:=0; existed boolean; prior_time timestamptz;
begin
 if p_lease is null or p_batch is null or jsonb_typeof(p_batch)<>'object' or octet_length(p_batch::text)>1000000 then
  raise exception 'Lote inválido' using errcode='22023';
 end if;
 batch_hash:=encode(sha256(convert_to(p_batch::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('catalog-lease:'||p_lease::text,0));
 select * into receipt from private.catalog_ingest_receipts where lease=p_lease;
 if found then
  if receipt.batch_hash<>batch_hash then raise exception 'Tentativa reutilizada com outro lote' using errcode='22023';end if;
  return receipt.counts;
 end if;
 select * into tile from private.catalog_tiles where lease=p_lease for update;
 if not found or tile.lease_until is null or tile.lease_until<=clock_timestamp() then
  raise exception 'Reserva expirada' using errcode='40001';
 end if;
 if not exists(select 1 from public.service_areas a where a.id=tile.area_id and a.ativa
  and tile.south>=a.south and tile.north<=a.north and tile.west>=a.west and tile.east<=a.east) then
  raise exception 'Área indisponível' using errcode='22023';
 end if;
 if p_batch->>'version' is distinct from '1' or p_batch->>'provider' is distinct from 'osm'
  or p_batch->>'license' is distinct from 'ODbL' or p_batch->>'attribution' is distinct from '© OpenStreetMap contributors'
  or coalesce(p_batch->>'snapshotSha256','') !~ '^[a-f0-9]{64}$'
  or p_batch->>'sourceOrigin' is null or p_batch->>'sourceOrigin' not in
   ('https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','snapshot:sha256:'||(p_batch->>'snapshotSha256'))
  or jsonb_typeof(p_batch->'rows') is distinct from 'array' or jsonb_array_length(p_batch->'rows')>400 then
  raise exception 'Política da fonte inválida' using errcode='22023';
 end if;
 collected:=(p_batch->>'collectedAt')::timestamptz;
 received:=(p_batch->>'received')::integer;rejected:=(p_batch->>'rejected')::integer;discarded:=(p_batch->>'discarded')::integer;
 if collected is null or not isfinite(collected) or collected<timestamptz '1970-01-01' or collected>clock_timestamp()+interval '5 minutes'
  or received is null or received not between 0 and 400 or rejected is null or rejected<0 or discarded is null or discarded<0
  or received<>rejected+discarded+jsonb_array_length(p_batch->'rows') then
  raise exception 'Metadados inválidos' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_batch->'rows') x group by x->>'id' having count(*)>1)
  or exists(select 1 from jsonb_array_elements(p_batch->'rows') x group by x->>'referencia_externa' having count(*)>1) then
  raise exception 'Lote duplicado' using errcode='22023';
 end if;
 -- Consistent order also serializes overlapping tiles that share provider references.
 for r in select value from jsonb_array_elements(p_batch->'rows') order by value->>'referencia_externa' loop
  perform pg_advisory_xact_lock(hashtextextended('catalog-osm:'||coalesce(r->>'referencia_externa',''),0));
 end loop;
 for r in select value from jsonb_array_elements(p_batch->'rows') order by value->>'referencia_externa' loop
  if jsonb_typeof(r) is distinct from 'object' or coalesce(r->>'id','')='' or char_length(r->>'id')>200
   or coalesce(r->>'referencia_externa','') !~ '^(node|way|relation)/[1-9][0-9]{0,15}$'
   or r->>'origem' is distinct from 'osm' or jsonb_typeof(r->'nome') is distinct from 'string'
   or char_length(btrim(r->>'nome')) not between 1 and 150 or jsonb_typeof(r->'endereco') is distinct from 'string'
   or char_length(r->>'endereco')>300 or jsonb_typeof(r->'categoria') is distinct from 'string' or char_length(r->>'categoria')>80
   or jsonb_typeof(r->'latitude') is distinct from 'number' or jsonb_typeof(r->'longitude') is distinct from 'number'
   or not ((r->>'latitude')::float8 between tile.south and tile.north and (r->>'longitude')::float8 between tile.west and tile.east) then
   raise exception 'Registro inválido' using errcode='22023';
  end if;
  select * into metadata from public.lugares_fontes where provedor='osm' and referencia=r->>'referencia_externa' for update;
  if found then
   if metadata.lugar_id<>r->>'id' then raise exception 'Identidade da fonte mudou' using errcode='40001';end if;
   prior_time:=(metadata.propriedades->>'snapshot_collected_at')::timestamptz;
   if prior_time>collected or (prior_time=collected and metadata.propriedades->>'snapshot_sha256' is distinct from p_batch->>'snapshotSha256') then
    raise exception 'Snapshot anterior ou conflitante' using errcode='40001';
   end if;
  end if;
  select * into prior from public.lugares where id=r->>'id' for update;existed:=found;
  if existed then
   if date_trunc('milliseconds',prior.atualizado_em)>collected then
    raise exception 'Snapshot anterior ao catálogo existente' using errcode='40001';
   end if;
   if prior.origem='osm' and prior.referencia_externa is distinct from r->>'referencia_externa' then raise exception 'Referência incompatível' using errcode='22023';end if;
   if prior.origem<>'osm' and metadata.referencia is null and
    (prior.referencia_externa is not null or private.normalizar_busca(prior.nome)<>private.normalizar_busca(r->>'nome')
     or power(prior.latitude-(r->>'latitude')::float8,2)+power(prior.longitude-(r->>'longitude')::float8,2)>=.000001) then
    raise exception 'Correspondência não confirmada' using errcode='22023';
   end if;
   if prior.duplicado_de is not null or prior.oculto_catalogo then raise exception 'Registro conciliado ou oculto' using errcode='22023';end if;
   if prior.cadastro_revisao>0 and (prior.nome,prior.endereco) is distinct from (r->>'nome',r->>'endereco') then manual_preserved:=manual_preserved+1;end if;
  elsif r->>'id' is distinct from 'osm:'||replace(r->>'referencia_externa','/',':') then
   raise exception 'Identidade de registro novo inválida' using errcode='22023';
  end if;
  -- Keep the existing reconciliation rules, IDs, links and manual-preservation trigger.
  insert into public.lugares(id,nome,endereco,latitude,longitude,origem,referencia_externa,categoria,atualizado_em)
  values(r->>'id',btrim(r->>'nome'),r->>'endereco',(r->>'latitude')::float8,(r->>'longitude')::float8,'osm',r->>'referencia_externa',r->>'categoria',collected)
  on conflict(id) do update set nome=excluded.nome,endereco=excluded.endereco,latitude=excluded.latitude,longitude=excluded.longitude,
   origem=excluded.origem,referencia_externa=excluded.referencia_externa,categoria=excluded.categoria,
   atualizado_em=greatest(public.lugares.atualizado_em,excluded.atualizado_em)
  returning * into saved;
  if not existed then made:=made+1;
  elsif (prior.nome,prior.endereco,prior.latitude,prior.longitude,prior.origem,prior.referencia_externa,prior.categoria)
   is distinct from (saved.nome,saved.endereco,saved.latitude,saved.longitude,saved.origem,saved.referencia_externa,saved.categoria) then changed:=changed+1;
  else unchanged:=unchanged+1;end if;
  insert into public.lugares_fontes(provedor,referencia,lugar_id,versao,propriedades)
  values('osm',r->>'referencia_externa',r->>'id',p_batch->>'snapshotSha256',jsonb_build_object(
   'snapshot_sha256',p_batch->>'snapshotSha256','snapshot_collected_at',collected,'license','ODbL','attribution',p_batch->>'attribution','source_origin',p_batch->>'sourceOrigin'))
  on conflict(provedor,referencia) do update set versao=excluded.versao,propriedades=public.lugares_fontes.propriedades||excluded.propriedades,importado_em=now();
 end loop;
 result:=jsonb_build_object('created',made,'updated',changed,'unchanged',unchanged,'manualPreserved',manual_preserved,'received',received,'rejected',rejected,'discarded',discarded);
 perform private.finalizar_catalogo_job(p_lease,received,null);
 insert into private.catalog_ingest_receipts(lease,batch_hash,counts) values(p_lease,batch_hash,result);
 -- Bounded retention; receipts contain no raw snapshots or account data.
 delete from private.catalog_ingest_receipts where lease in
  (select lease from private.catalog_ingest_receipts where created_at<now()-interval '7 days' order by created_at,lease limit 100);
 return result;
end $$;
create function public.confirmar_catalogo_ingestao(p_lease uuid,p_batch jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.confirmar_catalogo_ingestao(p_lease,p_batch)$$;
revoke all on function private.confirmar_catalogo_ingestao(uuid,jsonb),public.confirmar_catalogo_ingestao(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.confirmar_catalogo_ingestao(uuid,jsonb),public.confirmar_catalogo_ingestao(uuid,jsonb) to service_role;
notify pgrst,'reload schema';

-- Raw writes by old service-role workers must not bypass the lease fence.
revoke insert,update,delete on public.lugares from service_role;
