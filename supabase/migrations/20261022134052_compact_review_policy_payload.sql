-- Preserve the installed one-argument API while sending policy metadata only once
-- in the current app's batch. Both paths use the same authenticated live aggregate.
create function public.resumos_avaliacoes(p_lugares text[],p_compacto boolean) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare payload jsonb;
begin
 payload:=private.resumos_avaliacoes(p_lugares);
 if p_compacto is distinct from true then return payload;end if;
 return jsonb_build_object('politica',payload->0->'politica','resumos',(
  select coalesce(jsonb_agg(entry.item-'politica' order by entry.position),'[]'::jsonb)
  from jsonb_array_elements(payload) with ordinality as entry(item,position)
 ));
end $$;
revoke all on function public.resumos_avaliacoes(text[],boolean) from public,anon;
grant execute on function public.resumos_avaliacoes(text[],boolean) to authenticated;
create or replace function public.versao_app() returns integer language sql stable security invoker set search_path='' as $$select 10$$;
