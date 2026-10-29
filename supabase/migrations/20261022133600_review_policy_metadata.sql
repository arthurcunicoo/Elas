-- Private, versioned policy: only database operators can change these parameters.
-- Keep a privacy floor of five contributors; this is a perception, never a safety guarantee.
create table private.politica_avaliacoes (
 unica boolean primary key default true check (unica),
 versao integer not null check (versao>0),
 minimo integer not null check (minimo between 5 and 1000),
 janela_dias integer not null check (janela_dias between 1 and 730),
 limiar_favoravel numeric not null check (limiar_favoravel>0 and limiar_favoravel<=1),
 limiar_atencao numeric not null check (limiar_atencao>0 and limiar_atencao<=1)
);
alter table private.politica_avaliacoes enable row level security;
create policy politica_avaliacoes_bloqueada on private.politica_avaliacoes for all to anon,authenticated using (false) with check (false);
revoke all on private.politica_avaliacoes from public,anon,authenticated;
insert into private.politica_avaliacoes values(true,1,5,180,0.7,0.5);
create or replace function private.resumos_avaliacoes(p_lugares text[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; p private.politica_avaliacoes%rowtype; metodo text;
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_lugares is null or cardinality(p_lugares)>600 or array_position(p_lugares,null) is not null then raise exception 'Lista de lugares inválida' using errcode='22023';end if;
 select * into strict p from private.politica_avaliacoes where unica;
 metodo:=format('Consideramos uma contribuição por conta e lugar, aprovada e criada ou revisada nos últimos %s dias. Com pelo menos %s contribuições, %s%% ou mais em “Atenção” ou “Cuidado” indicam percepções de atenção. Caso contrário, %s%% ou mais em “Segura” indicam percepções favoráveis. Os demais resultados são variados. Editar, excluir ou rejeitar uma avaliação a remove do resumo até nova aprovação. São percepções da comunidade; não garantem segurança.',p.janela_dias,p.minimo,trim(trailing '.' from trim(trailing '0' from (p.limiar_atencao*100)::numeric(6,2)::text)),trim(trailing '.' from trim(trailing '0' from (p.limiar_favoravel*100)::numeric(6,2)::text)));
 select coalesce(jsonb_agg(jsonb_build_object(
  'lugar_id',s.lugar_id,'total',s.total,'minimo',p.minimo,'janela_dias',p.janela_dias,
  'politica',jsonb_build_object('versao',p.versao,'metodo',metodo),
  'classificacao',case when s.total<p.minimo then 'unknown' when (s.atencao+s.cuidado)::numeric/s.total>=p.limiar_atencao then 'attention' when s.segura::numeric/s.total>=p.limiar_favoravel then 'safe' else 'moderate' end,
  'distribuicao',case when s.total>=p.minimo then jsonb_build_object('Segura',s.segura,'Moderada',s.moderada,'Atenção',s.atencao,'Cuidado',s.cuidado) else null end,
  'ultima_contribuicao',case when s.total>=p.minimo then s.ultima else null end
 ) order by s.lugar_id),'[]'::jsonb) into result from (
  select l.id lugar_id,count(a.id)::integer total,
   count(a.id) filter(where a.sentimento='Segura')::integer segura,
   count(a.id) filter(where a.sentimento='Moderada')::integer moderada,
   count(a.id) filter(where a.sentimento='Atenção')::integer atencao,
   count(a.id) filter(where a.sentimento='Cuidado')::integer cuidado,
   (max(a.contribuida_em) at time zone 'America/Sao_Paulo')::date ultima
  from public.lugares l left join public.avaliacoes a on a.lugar_id=l.id and a.status='aprovada' and a.contribuida_em>=now()-make_interval(days=>p.janela_dias) and a.contribuida_em<=now()
  where l.id=any(p_lugares) group by l.id
 ) s;
 return result;
end $$;
revoke all on function private.resumos_avaliacoes(text[]) from public,anon;
grant execute on function private.resumos_avaliacoes(text[]) to authenticated;
create or replace function public.versao_app() returns integer language sql stable security invoker set search_path='' as $$select 9$$;
