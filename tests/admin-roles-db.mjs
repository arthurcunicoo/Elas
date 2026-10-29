import assert from 'node:assert/strict';
import {systemTestDatabase} from '../scripts/system-test-database.mjs';
const db = await systemTestDatabase(), uid = n => '00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const [A,B,U,M] = [1,2,3,4].map(uid);
const asUser = id => db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
const change = (target,role,before,reason='Equipe conferida pela administração') => db.query('select public.alterar_papel($1,$2,$3,$4)',[target,role,before,reason]);
const page = (history=false,cursor=null,search='') => db.query('select public.pagina_papeis($1,$2,$3) data',[search,cursor,history]).then(r=>r.rows[0].data);
try {
  await db.query('insert into auth.users values($1),($2),($3),($4)',[A,B,U,M]);
  await db.query("insert into public.perfis(id,nome) values($1,'Admin A'),($2,'Admin B'),($3,'Usuária'),($4,'Moderador')",[A,B,U,M]);
  await db.query("insert into private.papeis(usuario_id,papel) values($1,'admin'),($2,'moderador')",[A,M]);
  await asUser(U);await assert.rejects(page(),e=>e.code==='42501');await assert.rejects(change(U,'admin','usuario'),e=>e.code==='42501');
  await assert.rejects(db.query("insert into private.papeis(usuario_id,papel) values($1,'admin')",[U]));
  await asUser(M);await assert.rejects(page(),e=>e.code==='42501');await assert.rejects(change(B,'admin','usuario'),e=>e.code==='42501');
  await asUser(A);assert.equal((await page()).rows.length,4);
  await assert.rejects(change(A,'usuario','admin'),e=>e.code==='23514');
  await assert.rejects(change(B,'admin','usuario','x'),e=>e.code==='22023');
  await change(B,'admin','usuario');
  await assert.rejects(change(B,'moderador','usuario'),e=>e.code==='40001');
  await change(A,'usuario','admin');
  await assert.rejects(page(),e=>e.code==='42501','self-demotion removes authorization on the next request');
  await db.exec('reset role');
  assert.equal((await db.query('select admin_count from private.admin_control')).rows[0].admin_count,1);
  await assert.rejects(db.query('delete from private.papeis where usuario_id=$1',[B]),e=>e.code==='23514','raw delete cannot remove last admin');
  await assert.rejects(db.query('delete from auth.users where id=$1',[B]),e=>e.code==='23514','Auth deletion cannot remove last admin');
  await db.exec('set role service_role');
  await assert.rejects(db.query('select public.iniciar_exclusao_conta($1)',[B]),e=>e.code==='23514','erasure start must roll back before side effects');
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from private.contas_exclusao where usuario_id=$1',[B])).rows[0].n,0);
  await asUser(B);await change(A,'admin','usuario');
  // Two intents that each observed two admins cannot both remove them.
  const results=[];
  for(const target of [A,B]) {await asUser(B);try {await change(target,'usuario','admin');results.push('ok');}catch(e){results.push(e.code);}}
  assert.deepEqual(results,['ok','23514']);
  const history = await page(true);
  assert.ok(history.rows.some(r=>r.usuario_id===A && r.anterior==='admin' && r.novo==='usuario' && r.responsavel_id===B));
  assert.ok(history.rows.every(r=>r.motivo && r.nome && r.responsavel));
  const current=await db.query('select public.capacidades_backend() data');
  assert.equal(current.rows[0].data.version,12);assert.equal(current.rows[0].data.adminRoles,true);assert.equal(current.rows[0].data.atomicCatalog,true);
  await db.exec('reset role');
  for(let i=10;i<36;i++){await db.query('insert into auth.users values($1)',[uid(i)]);await db.query("insert into public.perfis(id,nome) values($1,$2)",[uid(i),'Pessoa '+i]);}
  await asUser(B);const first=await page();assert.equal(first.rows.length,20);assert.ok(first.nextCursor);
  const second=await page(false,first.nextCursor);assert.equal(new Set([...first.rows,...second.rows].map(r=>r.id)).size,30);
  await assert.rejects(page(false,first.nextCursor,'outra busca'),e=>e.code==='22023');
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[A]);
  await asUser(B);assert.ok((await page(true)).rows.every(r=>r.usuario_id!==A && r.responsavel_id!==A));
  await db.exec('reset role');
  await db.query("insert into private.papeis(usuario_id,papel) values($1,'admin')",[U]);
  await db.query('delete from auth.users where id=$1',[B]);
  assert.equal((await db.query('select admin_count from private.admin_control')).rows[0].admin_count,1);
  assert.equal((await db.query('select count(*)::int n from private.papeis_historico where usuario_id=$1 or responsavel_id=$1',[B])).rows[0].n,0,'Auth cascade must preserve anonymized audit without a dangling FK');
  await db.exec('reset role;set role anon');await assert.rejects(page());await assert.rejects(change(U,'admin','usuario'));
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int n from information_schema.role_table_grants where table_schema='private' and table_name in ('papeis','papeis_historico','admin_control') and grantee in ('anon','authenticated','service_role')")).rows[0].n,0);
  console.log('Admin roles passed: explicit authorization, audit, optimistic conflict, conditional last-admin counter, raw/Auth/erasure guards, self-demotion, bounded keyset, scope isolation and erasure anonymization. Concurrent intents are serialized locally, not independent connection proof.');
} finally {await db.close();}
