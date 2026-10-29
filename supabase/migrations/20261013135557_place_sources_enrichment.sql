-- Place identity and provider metadata. No account or review is deleted.
alter table public.lugares drop constraint lugares_origem_check;
alter table public.lugares add constraint lugares_origem_check check(origem in ('manual','osm','overture'));
alter table public.lugares add constraint lugares_overture_referencia check(origem<>'overture' or referencia_externa ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$');
alter table public.lugares
 add column duplicado_de text references public.lugares(id),
 add column oculto_catalogo boolean not null default false,
 add column fonte_dados text,
 add column dados_verificados_em timestamptz,
 add column foto_autor text,
 add column foto_licenca text,
 add column foto_fonte text check(foto_fonte is null or foto_fonte like 'https://%'),
 add column foto_data text,
 add constraint lugares_alias_diferente check(duplicado_de is null or duplicado_de<>id);
create index lugares_duplicado_idx on public.lugares(duplicado_de) where duplicado_de is not null;
create table public.lugares_fontes(
 provedor text not null check(provedor in ('osm','overture')),
 referencia text not null check(char_length(referencia) between 1 and 100),
 lugar_id text not null references public.lugares(id),
 versao text,
 confianca double precision check(confianca between 0 and 1),
 propriedades jsonb not null default '{}'::jsonb,
 importado_em timestamptz not null default now(),
 primary key(provedor,referencia)
);
create index lugares_fontes_lugar_idx on public.lugares_fontes(lugar_id);
alter table public.lugares_fontes enable row level security;
revoke all on public.lugares_fontes from public,anon,authenticated;
grant select on public.lugares_fontes to authenticated;
grant select,insert,update on public.lugares_fontes to service_role;
create policy fontes_ler on public.lugares_fontes for select to authenticated using(true);

create function private.validar_alias_lugar() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.duplicado_de is not null then
  if exists(select 1 from public.lugares where id=new.duplicado_de and duplicado_de is not null)
     or exists(select 1 from public.lugares where duplicado_de=new.id) then raise exception 'Alias encadeado não permitido'; end if;
  if exists(select 1 from public.avaliacoes where lugar_id=new.id)
     or exists(select 1 from public.favoritos where lugar_id=new.id)
     or exists(select 1 from public.relatos where lugar_id=new.id)
     or exists(select 1 from public.solicitacoes_melhoria where lugar_id=new.id) then raise exception 'O lugar possui vínculos: concilie antes de unir'; end if;
 end if;
 return new;
end $$;
revoke all on function private.validar_alias_lugar() from public,anon,authenticated;
create trigger validar_alias_lugar before insert or update of duplicado_de on public.lugares for each row execute function private.validar_alias_lugar();
create function private.canonizar_lugar_registro() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_id text;
begin
 if new.lugar_id is not null then
  select duplicado_de into v_id from public.lugares where id=new.lugar_id;
  new.lugar_id:=coalesce(v_id,new.lugar_id);
 end if;return new;
end $$;
revoke all on function private.canonizar_lugar_registro() from public,anon,authenticated;
create trigger canonizar_avaliacao before insert or update of lugar_id on public.avaliacoes for each row execute function private.canonizar_lugar_registro();
create trigger canonizar_favorito before insert or update of lugar_id on public.favoritos for each row execute function private.canonizar_lugar_registro();
create trigger canonizar_relato before insert or update of lugar_id on public.relatos for each row execute function private.canonizar_lugar_registro();
create trigger canonizar_melhoria before insert or update of lugar_id on public.solicitacoes_melhoria for each row execute function private.canonizar_lugar_registro();

create function public.resolver_lugar(p_id text) returns setof public.lugares language sql stable security invoker set search_path='' as $$
 select l.* from public.lugares l where l.id=(select coalesce(a.duplicado_de,a.id) from public.lugares a where a.id=p_id) limit 1
$$;
revoke all on function public.resolver_lugar(text) from public,anon;
grant execute on function public.resolver_lugar(text) to authenticated;
create or replace function public.buscar_lugares(p_busca text,p_categoria text,p_tags text[],p_conhecidas text[],p_pagina integer default 0)
returns setof public.lugares language plpgsql stable security invoker set search_path='' as $$
begin
 if p_pagina is null or p_pagina not between 0 and 10000 or coalesce(cardinality(p_tags),0)>100 or coalesce(cardinality(p_conhecidas),0)>100 then raise exception 'Busca inválida'; end if;
 if p_categoria not in ('all','parks','restaurants','cafes','markets','shops','health','education','sports','services','other') then raise exception 'Categoria inválida'; end if;
 return query select l.* from public.lugares l where l.duplicado_de is null and not l.oculto_catalogo
 and translate(lower(l.nome||' '||l.endereco),'áàâãéêíóôõúüç','aaaaeeiooouuc') like '%'||translate(lower(left(coalesce(p_busca,''),100)),'áàâãéêíóôõúüç','aaaaeeiooouuc')||'%'
 and (p_categoria='all' or l.categoria_app=p_categoria or (l.categoria_app is null and
  case when p_categoria='other' then l.categoria is null or not(l.categoria=any(p_conhecidas)) else l.categoria=any(p_tags) end))
 order by l.nome,l.id limit 21 offset p_pagina*20;
end $$;

create function public.importar_overture(p_registros jsonb,p_versao text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb;v_id text;l public.lugares;v_novo integer:=0;v_vinculado integer:=0;v_enderecos integer:=0;v_result integer;
begin
 if p_registros is null or p_versao is null or jsonb_typeof(p_registros)<>'array' or jsonb_array_length(p_registros)>2000 or octet_length(p_registros::text)>4000000 or p_versao !~ '^\d{4}-\d{2}-\d{2}\.\d+$' then raise exception 'Importação inválida'; end if;
 for r in select value from jsonb_array_elements(p_registros) loop
  if r->>'gers' !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' or coalesce((r->>'confianca')::double precision,0)<.9
    or char_length(btrim(r->>'nome')) not between 1 and 150 or char_length(r->>'endereco') not between 1 and 300
    or (r->>'latitude')::double precision not between -28.85 and -28.55 or (r->>'longitude')::double precision not between -49.55 and -49.2
    or r->>'categoria_app' not in ('parks','restaurants','cafes','markets','shops','health','education','sports','services','other') then raise exception 'Registro Overture inválido'; end if;
  select lugar_id into v_id from public.lugares_fontes where provedor='overture' and referencia=r->>'gers';
  v_id:=coalesce(v_id,nullif(r->>'target_id',''),'overture:'||(r->>'gers'));
  select * into l from public.lugares where id=v_id;
  if found and l.duplicado_de is not null then v_id:=l.duplicado_de;select * into l from public.lugares where id=v_id;end if;
  if not found then
   if v_id<>'overture:'||(r->>'gers') then raise exception 'Lugar de destino inexistente';end if;
   insert into public.lugares(id,nome,endereco,latitude,longitude,origem,referencia_externa,categoria,categoria_app,fonte_dados)
   values(v_id,r->>'nome',r->>'endereco',(r->>'latitude')::double precision,(r->>'longitude')::double precision,'overture',r->>'gers',r->>'categoria',r->>'categoria_app','Overture Maps Places · '||p_versao);
   v_novo:=v_novo+1;
  else
   -- An existing provider link is identity evidence. First-time links need proximity and compatible name, or a reviewed explicit link.
   if not exists(select 1 from public.lugares_fontes where provedor='overture' and referencia=r->>'gers') then
    if (power((l.latitude-(r->>'latitude')::double precision)*111000,2)+power((l.longitude-(r->>'longitude')::double precision)*111000*cos(l.latitude*pi()/180),2))>10000 then raise exception 'Correspondência distante';end if;
    if regexp_replace(translate(lower(l.nome),'áàâãéêíóôõúüç','aaaaeeiooouuc'),'[^a-z0-9]','','g')<>regexp_replace(translate(lower(r->>'nome'),'áàâãéêíóôõúüç','aaaaeeiooouuc'),'[^a-z0-9]','','g') and coalesce((r->>'human_link')::boolean,false)=false then raise exception 'Correspondência não revisada';end if;
   end if;
   update public.lugares set endereco=r->>'endereco',fonte_dados='Overture Maps Places · '||p_versao,atualizado_em=now()
   where id=v_id and cadastro_revisao=0
   and regexp_replace(translate(lower(endereco),'áàâãéêíóôõúüç','aaaaeeiooouuc'),'[^a-z0-9]','','g') in ('criciumasc','centrocriciumasc')
   and regexp_replace(translate(lower(r->>'endereco'),'áàâãéêíóôõúüç','aaaaeeiooouuc'),'[^a-z0-9]','','g') not in ('criciumasc','centrocriciumasc');
   get diagnostics v_result=row_count;v_enderecos:=v_enderecos+v_result;v_vinculado:=v_vinculado+1;
  end if;
  insert into public.lugares_fontes(provedor,referencia,lugar_id,versao,confianca,propriedades)
  values('overture',r->>'gers',v_id,p_versao,(r->>'confianca')::double precision,r-'target_id')
  on conflict(provedor,referencia) do update set versao=excluded.versao,confianca=excluded.confianca,propriedades=excluded.propriedades,importado_em=now();
 end loop;
 return jsonb_build_object('novos',v_novo,'vinculados',v_vinculado,'enderecos_completados',v_enderecos);
end $$;
revoke all on function public.importar_overture(jsonb,text) from public,anon,authenticated;
grant execute on function public.importar_overture(jsonb,text) to service_role;
create or replace function public.versao_app() returns integer language sql stable security invoker set search_path='' as $$select 4$$;
