-- Restore the prior retry interval. No job is enabled or executed.
do $jitter_rollback$ declare definition text;begin
 select pg_get_functiondef('private.finalizar_catalogo_job(uuid,integer,text)'::regprocedure) into definition;
 if strpos(definition,'+interval ''1 second''*floor(random()*60)')=0 then raise exception 'Expected jitter definition missing';end if;
 execute replace(definition,'+interval ''1 second''*floor(random()*60)','');
end $jitter_rollback$;
