-- Community perceptions only. Raw reviews, authors, comments and factors remain private.
alter table public.avaliacoes add column contribuida_em timestamptz not null default now();
update public.avaliacoes set contribuida_em=atualizado_em;
create or replace function public.revisar_avaliacao() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.atualizado_em:=now();
 if current_user='authenticated' or new.sentimento is distinct from old.sentimento or new.comentario is distinct from old.comentario then
  new.status:='pendente';new.contribuida_em:=clock_timestamp();
 end if;
 return new;
end $$;
create index avaliacoes_publico_recentes_idx on public.avaliacoes(lugar_id,contribuida_em desc) where status='aprovada';

-- A bounded read API deliberately aggregates across authors. It never returns rows or identifiers.
create function private.resumos_avaliacoes(p_lugares text[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_lugares is null or cardinality(p_lugares)>600 or array_position(p_lugares,null) is not null then raise exception 'Lista de lugares inválida' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'lugar_id',s.lugar_id,'total',s.total,'minimo',5,'janela_dias',180,
  'distribuicao',case when s.total>=5 then jsonb_build_object('Segura',s.segura,'Moderada',s.moderada,'Atenção',s.atencao,'Cuidado',s.cuidado) else null end,
  'ultima_contribuicao',case when s.total>=5 then s.ultima else null end
 ) order by s.lugar_id),'[]'::jsonb) into result
 from (
  select l.id lugar_id,count(a.id)::integer total,
   count(a.id) filter(where a.sentimento='Segura')::integer segura,
   count(a.id) filter(where a.sentimento='Moderada')::integer moderada,
   count(a.id) filter(where a.sentimento='Atenção')::integer atencao,
   count(a.id) filter(where a.sentimento='Cuidado')::integer cuidado,
   (max(a.contribuida_em) at time zone 'America/Sao_Paulo')::date ultima
  from public.lugares l left join public.avaliacoes a on a.lugar_id=l.id and a.status='aprovada' and a.contribuida_em>=now()-interval '180 days' and a.contribuida_em<=now()
  where l.id=any(p_lugares) group by l.id
 ) s;
 return result;
end $$;
create function public.resumos_avaliacoes(p_lugares text[]) returns jsonb language sql stable security invoker set search_path='' as $$select private.resumos_avaliacoes(p_lugares)$$;
revoke all on function private.resumos_avaliacoes(text[]),public.resumos_avaliacoes(text[]) from public,anon;
grant execute on function private.resumos_avaliacoes(text[]),public.resumos_avaliacoes(text[]) to authenticated;

-- One RLS-respecting snapshot, instead of four HTTP requests for this screen.
create function public.resumo_impactos() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('counts',(select jsonb_build_object(
  'solicitada',count(*) filter(where status='solicitada'),
  'em_andamento',count(*) filter(where status='em_andamento'),
  'concluida',count(*) filter(where status='concluida')
 ) from public.solicitacoes_melhoria),
 'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.criado_em desc,r.id),'[]'::jsonb) from (
  select id,titulo,descricao,status,criado_em from public.solicitacoes_melhoria where status<>'retirado' order by criado_em desc,id limit 20
 ) r));
$$;
revoke all on function public.resumo_impactos() from public,anon;
grant execute on function public.resumo_impactos() to authenticated;
create or replace function public.versao_app() returns integer language sql stable security invoker set search_path='' as $$select 5$$;
