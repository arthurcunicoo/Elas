-- Add bounded jitter to the existing database backoff. No job is activated here.
do $jitter$ declare definition text;begin
 select pg_get_functiondef('private.finalizar_catalogo_job(uuid,integer,text)'::regprocedure) into definition;
 if strpos(definition,'interval ''15 minutes''*power(2,least(attempts,5))')=0 then raise exception 'Unexpected catalog backoff definition';end if;
 execute replace(definition,'interval ''15 minutes''*power(2,least(attempts,5))','interval ''15 minutes''*power(2,least(attempts,5))+interval ''1 second''*floor(random()*60)');
end $jitter$;
