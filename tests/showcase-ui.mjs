import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Check request races and real/demo separation with the actual components and services.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
const native = { Text: 'Text', View: 'View', StyleSheet: { create: x => x } };
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const resolve = name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name in mocks) return mocks[name];
    if (name.endsWith('/lib/pagination')) return load('../lib/pagination.ts', {});
    if (name === './pagination' || name.endsWith('/services/pagination')) return { cursorPage: () => { throw Error('Unexpected paginated query in this non-paginated flow'); } };
    throw new Error('Unmocked import ' + name);
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
const theme = load('../constants/theme.ts', {});
const { DemoLabel } = load('../components/DemoLabel.tsx', { '../constants/theme': theme });
let user = 'first-user';
const requests = [];
const { PlaceReviewPreview } = load('../components/map/PlaceReviewPreview.tsx', {
  '../../lib/appMode': { showcaseEnabled: true, demoMode: false },
  './CommunityReviewSummary': { CommunityReviewSummary: () => React.createElement('Text', null, 'Real summary') },
  '../../constants/theme': theme,
  '../../features/auth/SessionProvider': { useSession: () => ({ session: user ? { user: { id: user } } : null }) },
  '../../services/showcase': { listDemonstrations: (type, placeId) => new Promise(resolve => requests.push({ type, placeId, resolve })) },
  '../DemoLabel': { DemoLabel },
  '../TouchFeedback': { TouchFeedback: p => React.createElement('TouchFeedback', p, p.children) },
});
let renderer, expanded = 0;
const render = (placeId, open = false) => React.createElement(PlaceReviewPreview, { placeId, expanded: open, onExpand: () => expanded++ });
const text = () => renderer.root.findAllByType('Text').map(n => n.children.filter(v => typeof v === 'string').join('')).join(' ');
try {
  await act(async () => { renderer = TestRenderer.create(render('place-a')); });
  assert.equal(requests[0].type, 'avaliacao');
  assert.equal(requests[0].placeId, 'place-a');
  await act(async () => renderer.update(render('place-b')));
  assert.equal(requests[1].placeId, 'place-b');
  await act(async () => requests[0].resolve([{ id: 'demo:old', descricao: 'Wrong place', nome_exibicao: 'Old' }]));
  assert.ok(!text().includes('Wrong place'), 'an older place request must never appear in the current card');
  const reviews = [1, 2, 3].map(i => ({ id: `demo:b:${i}`, nome_exibicao: 'Perfil de demonstração', sentimento: 'Moderada', descricao: `Fictional review ${i}` }));
  await act(async () => requests[1].resolve(reviews));
  assert.ok(text().includes('3 avaliações de demonstração'));
  await act(async () => renderer.root.findByType('TouchFeedback').props.onPress());
  assert.equal(expanded, 1);
  await act(async () => renderer.update(render('place-b', true)));
  assert.equal(requests.length, 2, 'expanding must reuse the current request');
  assert.ok(text().includes('DEMONSTRAÇÃO'));
  assert.ok(text().includes('Não representam a segurança'));
  for (let i = 1; i <= 3; i++) assert.ok(text().includes(`Fictional review ${i}`));
  user = 'second-user';
  await act(async () => renderer.update(render('place-b', true)));
  assert.ok(!text().includes('Fictional review'), 'switching accounts must discard the previous loaded state');
  await act(async () => requests[2].resolve([]));
  assert.equal(text(), 'Real summary');
  user = null;
  await act(async () => renderer.update(render('place-b', true)));
  assert.equal(requests.length, 3, 'signed-out screens must not request authenticated samples');
} finally {
  if (renderer) await act(async () => renderer.unmount());
  console.error = originalError;
}

const rpcCalls = [];
const { registerEvent } = load('../features/community/community.ts', {
  '../../lib/supabase': { requireBackend: () => ({ rpc: async (name, args) => { rpcCalls.push({ name, args }); return { error: null }; } }) },
});
await assert.rejects(registerEvent('demo:evento:1', true), /demonstração/);
assert.equal(rpcCalls.length, 0, 'fictional participation must not reach a real RPC');
await registerEvent('real-event-id', true);
assert.deepEqual(rpcCalls, [{ name: 'inscrever', args: { p_evento: 'real-event-id', p_participar: true } }]);

let realRows = [{ id: 'real-improvement', titulo: 'Real', status: 'solicitada', propria: true, descricao: 'Real request', criado_em: '2026-10-15' }], exampleReads = 0;
const { listImprovements } = load('../services/improvements.ts', {
  '../lib/supabase': { supabase: { rpc: async name => { assert.equal(name, 'painel_impactos'); return { error: null, data: { minhas: { rows: realRows, counts: { solicitada: realRows.length, em_andamento: 0, concluida: 0 } }, cidade: { rows: [], counts: { em_andamento: 0, concluida: 0 } } } }; } } },
  '../constants/impactStatus': load('../constants/impactStatus.ts', { './theme': theme }),
  './showcase': { listDemonstrations: async () => { exampleReads++; return [{ id: 'demo:impacto:1' }]; } },
});
const real = await listImprovements();
assert.equal(real.minhas.rows[0].id, 'real-improvement');
assert.deepEqual(real.examples, []);
assert.equal(exampleReads, 0, 'real improvements must not depend on the optional showcase query');
realRows = [];
const demo = await listImprovements();
assert.equal(demo.examples[0].id, 'demo:impacto:1');
assert.equal(demo.minhas.counts.solicitada, 0, 'demo items must not inflate real database counters');
console.log('Showcase flow checks passed: place/account request races, explicit labels, signed-out cleanup, blocked fictional registrations, real RPC unchanged, real impacts replace examples without changing counters.');
