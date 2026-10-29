-- Run with an operator connection. All fixture writes roll back. Requires two existing Auth users.
begin;
select set_config('elas.test_a',(select id::text from auth.users order by created_at limit 1),true);
select set_config('elas.test_b',(select u.id::text from auth.users u where u.id::text<>current_setting('elas.test_a') and not exists(select 1 from private.papeis p where p.usuario_id=u.id) order by u.created_at limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('elas.test_a'),true);
do $$
declare review_id uuid; repeat_id uuid; author uuid:=auth.uid(); visible integer; blocked boolean;
begin
 if author is null or nullif(current_setting('elas.test_b'),'') is null then raise exception 'Two existing users are required';end if;
 select public.salvar_avaliacao('nereu','Segura','Fixture transitória',array['iluminacao']) into review_id;
 select public.salvar_avaliacao('nereu','Moderada','Fixture revisada',array['movimento']) into repeat_id;
 if review_id<>repeat_id then raise exception 'Review id changed';end if;
 perform set_config('request.jwt.claim.sub',current_setting('elas.test_b'),true);
 select count(*) into visible from public.avaliacoes where id=review_id;
 if visible<>0 then raise exception 'Cross-account read exposed';end if;
 update public.avaliacoes set comentario='Alteração proibida' where id=review_id;
 if found then raise exception 'Cross-account update exposed';end if;
 blocked:=false;
 begin perform public.admin_resumo();exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Ordinary account accessed admin';end if;
 blocked:=false;
 begin perform 1 from public.catalogo_osm_cache;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Internal cache exposed';end if;
 blocked:=false;
 begin perform 1 from private.papeis;exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Roles exposed';end if;
 perform set_config('request.jwt.claim.sub',author::text,true);
 select count(*) into visible from public.avaliacoes where id=review_id and comentario='Fixture revisada';
 if visible<>1 then raise exception 'Original review modified by another user';end if;
end $$;
reset role;
rollback;
select 'passed: live SQL, existing user IDs, simulated JWT claims, all fixture writes rolled back' verification;
