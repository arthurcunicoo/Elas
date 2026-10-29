import { createTestDatabase } from '../scripts/test-database.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = createTestDatabase();
const ids = Array.from({ length: 9 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12,'0')}`), [A,B,C,D,E,F,G,ADMIN,H] = ids;
const asUser = async id => db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id ?? ''}',false)`);
const denied = async sql => { let error; try { await db.exec(sql); } catch(e) { error=e; } assert.ok(error, sql); };
const summary = async () => (await db.query("select public.resumos_avaliacoes(array['nereu']) data")).rows[0].data[0];
const moderate = async (id, before, status) => { await asUser(ADMIN); await db.query('select public.moderar($1,$2,$3,$4,$5)',['avaliacao',id,status,'Decisão de teste justificada',before]); };
async function review(user, mood='Segura') { await asUser(user); return (await db.query("select public.salvar_avaliacao('nereu',$1,'Comentário privado de teste',array['iluminacao']) id",[mood])).rows[0].id; }
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);
 for(const file of readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
 await db.query("insert into private.papeis(usuario_id,papel) values($1,'admin')",[ADMIN]);
 await db.exec('set role anon');await denied("select public.resumos_avaliacoes(array['nereu'])");await denied('select public.resumo_impactos()');
 await asUser(null);await denied("select public.resumos_avaliacoes(array['nereu'])");
 await asUser(B);assert.equal((await summary()).total,0);
 await denied("select public.resumos_avaliacoes(array_fill('nereu'::text,array[601]))");await denied("select public.resumos_avaliacoes(array[null]::text[])");
 const first = await review(A);await asUser(B);assert.equal((await summary()).total,0,'pending review cannot enter the public summary');
 await moderate(first,'pendente','aprovada');await asUser(B);
 let data = await summary();assert.equal(data.total,1);assert.equal(data.distribuicao,null);assert.equal(data.ultima_contribuicao,null);
 assert.equal((await db.query('select count(*)::int n from public.avaliacoes')).rows[0].n,0,'another author cannot read the newly approved raw review');
 const reviewed=[first];for(const [user,mood] of [[B,'Segura'],[C,'Segura'],[D,'Segura'],[E,'Atenção']]){const id=await review(user,mood);reviewed.push(id);await moderate(id,'pendente','aprovada');}
 await asUser(G);data=await summary();assert.equal(data.total,5);assert.deepEqual(data.distribuicao,{Segura:4,Moderada:0,Atenção:1,Cuidado:0});assert.ok(data.ultima_contribuicao);
 assert.ok(!JSON.stringify(data).includes('comentario')&&!JSON.stringify(data).includes('usuario_id')&&!JSON.stringify(data).includes('Comentário privado'));
 assert.equal((await db.query("select jsonb_array_length(public.resumos_avaliacoes(array['nereu','nereu','missing'])) n")).rows[0].n,1,'duplicate and missing place IDs are bounded safely');
 // Change policy in a rolled-back fixture: aggregate and explanation must follow together.
 const compact=(await db.query("select public.resumos_avaliacoes(array['nereu'],true) data")).rows[0].data;
 assert.equal(compact.politica.versao,1);assert.equal(compact.resumos.length,1);assert.ok(!('politica' in compact.resumos[0]));assert.equal(compact.resumos[0].classificacao,data.classificacao);
 assert.deepEqual((await db.query("select public.resumos_avaliacoes(array['nereu'],false) data")).rows[0].data[0],data);
 assert.deepEqual((await db.query("select public.resumos_avaliacoes(array[]::text[],true) data")).rows[0].data,{politica:null,resumos:[]});
 assert.equal(data.classificacao,'safe');assert.equal(data.politica.versao,1);assert.ok(data.politica.metodo.includes('70%'));
 await denied('select * from private.politica_avaliacoes');
 await denied("update private.politica_avaliacoes set minimo=8");
 await db.exec('reset role;begin;savepoint policy');
 await db.exec('update private.politica_avaliacoes set versao=2,minimo=8,janela_dias=90,limiar_favoravel=.8,limiar_atencao=.6');
 await asUser(G);data=await summary();assert.equal(data.minimo,8);assert.equal(data.janela_dias,90);assert.equal(data.classificacao,'unknown');assert.equal(data.distribuicao,null);assert.equal(data.politica.versao,2);assert.ok(data.politica.metodo.includes('80%'));
 for(const user of [F,G,H]){const extra=await review(user,'Moderada');await moderate(extra,'pendente','aprovada');}
 await asUser(G);data=await summary();assert.equal(data.total,8);assert.equal(data.classificacao,'moderate');
 await db.exec('reset role;update private.politica_avaliacoes set limiar_favoravel=.5');await asUser(G);data=await summary();assert.equal(data.classificacao,'safe');assert.ok(data.politica.metodo.includes('50%'));
 await db.exec('reset role;update private.politica_avaliacoes set limiar_atencao=.1');await asUser(G);data=await summary();assert.equal(data.classificacao,'attention');assert.ok(data.politica.metodo.includes('10%'));
 await db.exec('reset role;update private.politica_avaliacoes set limiar_atencao=1');await asUser(G);assert.ok((await summary()).politica.metodo.includes('100%'));
 await db.exec('reset role');await db.query("update public.avaliacoes set contribuida_em=now()-interval '100 days' where id=$1",[first]);await asUser(G);data=await summary();assert.equal(data.total,7);assert.equal(data.distribuicao,null);assert.equal(data.classificacao,'unknown');
 await db.exec('rollback to policy;rollback');
 await asUser(A);await denied("update public.avaliacoes set contribuida_em=now()+interval '5 days'");
 await review(A,'Cuidado');await asUser(G);assert.equal((await summary()).total,4,'editing an approved review removes it until approval');
 await moderate(first,'pendente','aprovada');await asUser(G);assert.equal((await summary()).total,5);
 await moderate(reviewed[1],'aprovada','rejeitada');await asUser(G);assert.equal((await summary()).total,4,'rejection takes effect without a rebuild');
 await asUser(C);await db.query('delete from public.avaliacoes where id=$1',[reviewed[2]]);await asUser(G);assert.equal((await summary()).total,3,'author withdrawal removes the contribution');
 const old=await review(F);await db.exec('reset role');await db.query("update public.avaliacoes set contribuida_em=now()-interval '181 days' where id=$1",[old]);
 const contributed=(await db.query('select contribuida_em from public.avaliacoes where id=$1',[old])).rows[0].contribuida_em;
 await moderate(old,'pendente','aprovada');await db.exec('reset role');assert.deepEqual((await db.query('select contribuida_em from public.avaliacoes where id=$1',[old])).rows[0].contribuida_em,contributed,'moderation must not make an old experience recent');
 await asUser(G);assert.equal((await summary()).total,3,'expired contribution remains excluded after moderation');
 await review(F,'Moderada');await moderate(old,'pendente','aprovada');await asUser(G);assert.equal((await summary()).total,4,'author revision renews the contribution window');
 await asUser(A);const request='10000000-0000-0000-0000-000000000001';await db.query("select public.enviar_registro('melhoria',$1,'{\"titulo\":\"Iluminação\",\"descricao\":\"Mais pontos de iluminação\"}'::jsonb)",[request]);
 let impacts=(await db.query('select public.resumo_impactos() data')).rows[0].data;assert.equal(impacts.counts.solicitada,1);assert.equal(impacts.rows.length,1);
 await asUser(B);impacts=(await db.query('select public.resumo_impactos() data')).rows[0].data;assert.equal(impacts.counts.solicitada,0);assert.equal(impacts.rows.length,0,'impact counts and rows must use the same RLS visibility');
 await asUser(ADMIN);await db.query("select public.moderar('melhoria',$1,'em_andamento','Pedido aceito para análise','solicitada')",[request]);
 await asUser(B);impacts=(await db.query('select public.resumo_impactos() data')).rows[0].data;assert.equal(impacts.counts.em_andamento,1);assert.equal(impacts.rows.length,1);
 // Personal and city universes stay distinct, even when the author owns a public improvement.
 const panel = async () => (await db.query('select public.painel_impactos() data')).rows[0].data;
 await asUser(null);await denied('select public.painel_impactos()');await denied("select private.opcoes_enquete(gen_random_uuid())");
 await db.exec('reset role;set role anon');await denied('select public.painel_impactos()');
 await asUser(A);let scoped=await panel();
 assert.deepEqual(scoped.minhas.counts,{solicitada:0,em_andamento:1,concluida:0});
 assert.deepEqual(scoped.cidade.counts,{em_andamento:1,concluida:0});assert.equal(scoped.minhas.rows[0].propria,true);
 await asUser(B);scoped=await panel();assert.equal(scoped.minhas.rows.length,0);assert.equal(scoped.cidade.rows[0].propria,false);
 await db.exec('reset role');
 await db.query("insert into public.solicitacoes_melhoria(usuario_id,titulo,descricao,status) values($1,'Meu pedido inicial','Descrição válida','solicitada'),($1,'Outro pedido inicial','Descrição válida','solicitada'),($1,'Entrega própria','Descrição válida','concluida'),($1,'Pedido retirado','Descrição válida','retirado'),($2,'Pedido confidencial','Descrição privada','solicitada')",[A,B]);
 await asUser(A);scoped=await panel();assert.deepEqual(scoped.minhas.counts,{solicitada:2,em_andamento:1,concluida:1});assert.equal(scoped.minhas.rows.length,4);
 assert.deepEqual(scoped.cidade.counts,{em_andamento:1,concluida:1});assert.equal(scoped.cidade.rows.length,2);assert.ok(scoped.cidade.rows.every(r=>r.propria));
 assert.ok(!JSON.stringify(scoped).includes('Pedido confidencial'));assert.ok(!JSON.stringify(scoped).includes('usuario_id'));
 let history=(await db.query("select public.pagina_app('melhorias',null,'{\"publicas\":true}') data")).rows[0].data;
 assert.equal(history.rows.length,2);assert.ok(history.rows.every(r=>['em_andamento','concluida'].includes(r.status)));
 await asUser(B);scoped=await panel();assert.equal(scoped.minhas.counts.solicitada,1);assert.equal(scoped.cidade.counts.concluida,1);
 await db.exec('reset role');
 await db.query("insert into public.solicitacoes_melhoria(usuario_id,titulo,descricao,status) select $1,'Entrega pública','Descrição válida','concluida' from generate_series(1,25)",[B]);
 await asUser(A);scoped=await panel();assert.equal(scoped.minhas.counts.concluida,1);assert.equal(scoped.cidade.counts.concluida,26);assert.equal(scoped.cidade.rows.length,20,'bounded recent rows must not truncate aggregate counters');
 // A public report feed cannot silently include the reader's private pending report.
 await db.exec('reset role');
 await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto,status) values($1,'Outro','Relato pendente do autor','Centro','pendente'),($2,'Outro','Relato privado de outra pessoa','Centro','pendente'),($1,'Outro','Relato público verificado','Centro','verificado')",[A,B]);
 await asUser(A);
 const feed=(await db.query("select public.pagina_app('relatos',null,'{\"recentes\":true,\"publicas\":true}') data")).rows[0].data;
 assert.equal(feed.rows.length,1);assert.equal(feed.rows[0].status,'verificado');
 const mine=(await db.query("select public.pagina_app('registros_relato') data")).rows[0].data;
 assert.equal(mine.rows.length,2);assert.ok(mine.rows.some(r=>r.status==='pendente'));
 // Both poll APIs and the private projection protect aggregates before participation.
 await db.exec('reset role');
 const open=(await db.query("insert into public.enquetes(pergunta,encerra_em,publicado) values('Prioridade comunitária?',now()+interval '1 day',true) returning id")).rows[0].id;
 const closed=(await db.query("insert into public.enquetes(pergunta,encerra_em,publicado) values('Enquete encerrada?',now()-interval '1 day',true) returning id")).rows[0].id;
 const hidden=(await db.query("insert into public.enquetes(pergunta,encerra_em,publicado) values('Rascunho privado?',now()-interval '1 day',false) returning id")).rows[0].id;
 const options=(await db.query("insert into public.enquete_opcoes(enquete_id,texto,ordem) values($1,'Iluminação',0),($1,'Acessibilidade',1),($2,'Iluminação',0),($3,'Opção confidencial',0) returning id,enquete_id",[open,closed,hidden])).rows;
 const option=options[0].id, alternative=options[1].id;
 await asUser(A);await db.query('select public.votar($1,$2)',[open,option]);
 const readPoll=async legacy=>(await db.query(legacy?'select public.listar_enquetes(0) data':"select public.pagina_app('enquetes') data")).rows[0].data;
 await asUser(B);
 for(const legacy of [false,true]) {
   const payload=await readPoll(legacy), rows=legacy?payload:payload.rows;
   const neutral=rows.find(r=>r.id===open), ended=rows.find(r=>r.id===closed);
   assert.equal(neutral.resultados_visiveis,false);assert.equal(neutral.minha_opcao,null);assert.ok(neutral.opcoes.every(o=>o.votos===null));
   assert.equal(ended.resultados_visiveis,true);assert.equal(ended.encerrada,true);assert.equal(ended.opcoes[0].votos,0);
   assert.ok(!rows.some(r=>r.id===hidden));
 }
 assert.ok((await db.query('select private.opcoes_enquete($1) data',[open])).rows[0].data.every(o=>o.votos===null));
 assert.deepEqual((await db.query('select private.opcoes_enquete($1) data',[hidden])).rows[0].data,[]);
 assert.equal((await db.query('select count(*)::int n from public.votos')).rows[0].n,0,'raw votes cannot bypass the result gate');
 await db.query('select public.votar($1,$2)',[open,alternative]);
 let voted=(await readPoll(false)).rows.find(r=>r.id===open);assert.equal(voted.resultados_visiveis,true);assert.deepEqual(voted.opcoes.map(o=>o.votos),[1,1]);
 await db.query('select public.votar($1,$2)',[open,option]);voted=(await readPoll(false)).rows.find(r=>r.id===open);assert.deepEqual(voted.opcoes.map(o=>o.votos),[2,0]);
 await db.exec('reset role');await db.query("update public.enquetes set encerra_em=now()-interval '1 second' where id=$1",[open]);
 await asUser(C);voted=(await readPoll(false)).rows.find(r=>r.id===open);assert.equal(voted.minha_opcao,null);assert.equal(voted.resultados_visiveis,true);assert.equal(voted.opcoes[0].votos,2);
 console.log('Product scope checks passed: private/personal/public counters, independent city totals, bounded rows, no pending author leaks, public-only report feed, private own records, neutral poll projections in cursor and legacy APIs, vote/change/end lifecycle and no direct aggregate bypass.');

 console.log('Community database checks passed: auth bounds, pending/approved/edited/rejected/withdrawn/expired/revised lifecycle, 5-person threshold, hidden comments/authors, moderation preserves experience date, live aggregates and one RLS-consistent impact snapshot.');
} finally {await db.close();}
