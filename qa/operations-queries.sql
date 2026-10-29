-- Owner/operator only; read aggregates, never execute cleanup or send push.
select public.versao_app() as schema_version;
select (select dias from private.retencao_envios where id) dias,count(*) total,
 count(*) filter(where criado_em<now()-make_interval(days=>(select dias from private.retencao_envios where id)) and (reter_ate is null or reter_ate<=now())) elegiveis,
 count(*) filter(where reter_ate>now()) retidos_auditoria,min(criado_em) mais_antigo from private.envios;
select jobname,schedule,active from cron.job where jobname like 'elas-%' order by jobname;
select j.jobname,r.status,count(*) execucoes,max(r.end_time) ultima_finalizacao
 from cron.job j join cron.job_run_details r on r.jobid=j.jobid where j.jobname like 'elas-%' and r.start_time>now()-interval '1 day' group by j.jobname,r.status;
select ativo,projeto_expo is not null projeto_configurado,endpoint is not null endpoint_configurado from private.push_config where id;
select estado,erro,count(*) entregas,min(criado_em) mais_antiga from private.push_fila group by estado,erro;
select 'relatos_pendentes' fila,count(*) total,min(criado_em) mais_antigo from public.relatos where status='pendente'
 union all select 'melhorias_solicitadas',count(*),min(criado_em) from public.solicitacoes_melhoria where status='solicitada'
 union all select 'avaliacoes_pendentes',count(*),min(criado_em) from public.avaliacoes where status='pendente';
