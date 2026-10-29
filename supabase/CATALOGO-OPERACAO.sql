-- Read-only operational checks. Run as the project owner; never print Vault values.
select public.versao_app();
select id,nome,estado,ativa,prioridade from public.service_areas order by prioridade desc,id;
select jobname,schedule,active from cron.job where jobname='elas-catalog-refresh';
select area_id,count(*) as cells,
 count(*) filter(where not disabled and next_due<=now()) as due,
 count(*) filter(where lease_until>now()) as leased,
 count(*) filter(where disabled) as subdivided,
 count(*) filter(where last_error is not null) as failed,
 max(updated_at) as last_success
from private.catalog_tiles group by area_id;
select area_id,last_error,attempts,next_due from private.catalog_tiles where last_error is not null order by next_due limit 20;
select jobid,start_time,end_time,status from cron.job_run_details where jobid in (select jobid from cron.job where jobname='elas-catalog-refresh') order by start_time desc limit 20;
