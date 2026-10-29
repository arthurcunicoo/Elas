import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { eventSchedule } from '../lib/eventPresentation.ts';

// Exercise the real sheets, fields and form. Native hosts have no layout engine;
// these checks cover interactions/data isolation, not screenshots or keyboard geometry.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
class AnimatedValue { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return 0; } stopAnimation() {} }
const animation = () => ({ start(callback) { callback?.({ finished: true }); }, stop() {} });
const native = {
  Image: 'Image', Linking: { openURL: async () => {} }, View: 'View', Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: props => props.visible ? React.createElement('Modal', props, props.children) : null,
  FlatList: props => React.createElement('FlatList', props, props.data.length ? props.data.map(item => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item }))) : props.ListEmptyComponent, props.ListFooterComponent),
  Easing: { out: value => value, cubic: value => value },
  Platform: { OS: 'ios' }, StyleSheet: { create: value => value, absoluteFill: {} }, Keyboard: { dismiss() {} },
  useWindowDimensions: () => ({ width: 398, height: 854 }),
  Animated: { Value: AnimatedValue, View: 'AnimatedView', timing: animation, spring: animation, parallel: animation },
};
const place = { id: 'nereu', name: 'Praça Nereu Ramos', address: 'Centro, Criciúma', category: 'square' };
let params = {}, ensure = async () => place, focused = '', savedPayload, created = 0;
const navigations = [], calls = [];
const router = { push: target => navigations.push(target), canGoBack: () => true, back() {} };
const touch = props => React.createElement('TouchFeedback', props, props.children);
const mocks = {
  'react': React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
  'expo-router': { router, useLocalSearchParams: () => params },
  'expo-status-bar': { StatusBar: 'StatusBar' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 34 }) },
};
const localMocks = {
  'hooks/useServiceTimeZone.ts':{useServiceTimeZone:()=> 'America/Sao_Paulo'},
  'components/loading/LoadingIndicator.tsx':{LoadingIndicator: props=>React.createElement('LoadingIndicator',props)},
  'components/icons/Ionicon.tsx': { default: 'Icon' },
  'components/TouchFeedback.tsx': { TouchFeedback: touch },
  'components/DraftGuard.tsx': { DraftGuard: () => null },
  'hooks/useReducedMotion.ts': { useReducedMotion: () => true },
  'features/auth/SessionProvider.tsx': { useSession: () => ({ session: { user: { id: 'test-user' } } }) },
  'features/map/CatalogProvider.tsx': { useCatalog: () => ({ ensurePlace: ensure }) },
  'features/map/LocationProvider.tsx': { useLocation: () => ({ userLocation: { latitude: -28.68, longitude: -49.37 } }) },
  'features/profile/FavoriteButton.tsx': { FavoriteButton: () => null },
  'components/AchievementProgressBar.tsx': { AchievementProgressBar: props => React.createElement('Progress',props) },
  'components/map/PlaceReviewPreview.tsx': { PlaceReviewPreview: () => null },
  'lib/supabase.ts': { friendlyError: e => e.message },
  'features/map/usePlaceSearch.ts': { usePlaceSearch: query => ({ rows: query.toLowerCase().includes('nereu') ? [place] : [], loading: false, error: '', hasMore: false, retry() {}, more() {} }) },
  'features/reports/drafts.ts': { useDraft: (_scope, initial) => {
    const [value, setValue] = React.useState(initial);
    return { value, setValue, ready: true, error: '', restored: false, prepare: async payload => { savedPayload = payload; return 'request-id'; }, clear: async () => setValue(initial) };
  } },
  'services/improvements.ts': { createImprovement: (...args) => new Promise((resolve, reject) => calls.push({ args, resolve, reject })) },
};
function load(relative) {
  if (relative in localMocks) return localMocks[relative];
  if (modules.has(relative)) return modules.get(relative).exports;
  const module = { exports: {} }; modules.set(relative, module);
  const file = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const resolve = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.')) throw new Error('Unmocked import ' + name);
    const base = path.resolve(path.dirname(file), name);
    const candidate = [base, base + '.tsx', base + '.ts'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    assert.ok(candidate, 'Resolve ' + name); if (/\.(jpg|png)$/.test(candidate)) return 1; return load(path.relative(root, candidate));
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
const { ImprovementRequest } = load('components/impacts/ImprovementRequest.tsx');
const { EventDetailsSheet } = load('components/events/EventDetailsSheet.tsx');
const { PlacePicker } = load('features/map/PlacePicker.tsx');
const { ProfileDialog } = load('components/ProfileDialog.tsx');
let renderer;
const text = () => renderer.root.findAllByType('Text').map(n => n.children.filter(x => typeof x === 'string').join('')).join(' ');
const buttons = label => renderer.root.findAll(n => n.type === 'TouchFeedback' && n.props.label === label);
const button = label => { const result = buttons(label); assert.equal(result.length, 1, label); return result[0]; };
const input = label => renderer.root.findAll(n => n.type === 'TextInput' && n.props.accessibilityLabel === label)[0];
const press = async label => { const node = button(label); assert.ok(!node.props.disabled && !node.props.busy, label + ' is enabled'); await act(async () => node.props.onPress()); };
const change = async (label, value) => { await act(async () => input(label).props.onChangeText(value)); };
const mount = async element => { await act(async () => { renderer = TestRenderer.create(element, { createNodeMock: node => node.type === 'TextInput' ? { focus() { focused = node.props.accessibilityLabel; } } : {} }); }); };
const unmount = async () => { await act(async () => renderer.unmount()); };
try {
  await mount(React.createElement(ImprovementRequest, { onCreated: () => created++ }));
  assert.equal(renderer.root.findAllByType('Modal').length, 0, 'entry card does not expose a long inline form');
  await press('Sugerir melhoria');
  assert.equal(renderer.root.findAllByType('Modal').length, 1);
  await press('Enviar solicitação');
  assert.equal(calls.length, 0); assert.equal(focused, 'Título da melhoria');
  assert.ok(text().includes('Use pelo menos 3 caracteres'));
  await change('Título da melhoria', '  Iluminar o caminho  ');
  await press('Enviar solicitação');
  assert.equal(focused, 'Descrição da melhoria');
  await change('Descrição da melhoria', '  Instalar mais pontos de luz no trajeto.  ');
  await press('Adicionar um lugar');
  assert.equal(renderer.root.findAllByType('Modal').length, 1, 'place selection must reuse the form sheet');
  assert.ok(text().includes('Escolher lugar'));
  await press('Voltar à etapa anterior');
  assert.equal(input('Título da melhoria').props.value, '  Iluminar o caminho  ');
  await press('Adicionar um lugar');
  await change('Nome do lugar', 'Nereu');
  await press('Selecionar Praça Nereu Ramos, Centro, Criciúma');
  assert.ok(text().includes('Praça Nereu Ramos'));
  await press('Fechar Nova sugestão');
  await press('Sugerir melhoria');
  assert.equal(input('Título da melhoria').props.value, '  Iluminar o caminho  ', 'closing and reopening preserves the draft');
  const submit = button('Enviar solicitação').props.onPress;
  await act(async () => { submit(); submit(); });
  assert.equal(calls.length, 1, 'double taps must not create two requests');
  assert.deepEqual(calls[0].args, ['request-id', 'Iluminar o caminho', 'Instalar mais pontos de luz no trajeto.', 'nereu']);
  assert.deepEqual(savedPayload, { titulo: 'Iluminar o caminho', descricao: 'Instalar mais pontos de luz no trajeto.', lugar_id: 'nereu' });
  await act(async () => renderer.root.findByType('Modal').props.onRequestClose());
  assert.equal(renderer.root.findAllByType('Modal').length, 1, 'a pending submission must not disappear on Android back');
  await act(async () => calls[0].resolve('saved-id'));
  assert.equal(created, 1); assert.ok(text().includes('Sua solicitação foi salva'));
  await press('Acompanhar solicitação');
  assert.deepEqual(navigations.at(-1), { pathname: '/registro', params: { kind: 'melhoria', id: 'saved-id' } });
  await press('Ver solicitação enviada'); await press('Enviar outra sugestão');
  assert.equal(input('Título da melhoria').props.value, '');
  assert.ok(!text().includes('Praça Nereu Ramos'), 'a new submission must not retain the previous place');
  await change('Título da melhoria', 'Nova ideia'); await change('Descrição da melhoria', 'Descrição que precisa ser mantida.');
  await press('Enviar solicitação');
  await act(async () => calls[1].reject(new Error('Conexão indisponível')));
  assert.ok(text().includes('Conexão indisponível'));
  assert.equal(input('Descrição da melhoria').props.value, 'Descrição que precisa ser mantida.', 'failed sends must preserve entered text');
  await unmount();

  params = { placeId: 'nereu' };
  const pendingPlaces = [];
  ensure = () => new Promise(resolve => pendingPlaces.push(resolve));
  await mount(React.createElement(ImprovementRequest, { onCreated() {} }));
  assert.equal(renderer.root.findAllByType('Modal').length, 1, 'map route opens the form directly');
  assert.equal(button('Enviar solicitação').props.disabled, true, 'wait for the routed place before allowing submission');
  await act(async () => pendingPlaces[0](place));
  // Persisting a routed place updates the draft; its normal restore lookup can complete too.
  if (pendingPlaces[1]) await act(async () => pendingPlaces[1](place));
  assert.ok(text().includes('Praça Nereu Ramos'));
  assert.ok(!button('Enviar solicitação').props.disabled);
  await unmount(); params = {};

  let selected = null;
  await mount(React.createElement(PlacePicker, { value: null, onChange: p => { selected = p; } }));
  await press('Adicionar um lugar');
  await change('Nome do lugar', 'Nereu'); await press('Selecionar Praça Nereu Ramos, Centro, Criciúma');
  assert.equal(selected.id, 'nereu'); assert.equal(renderer.root.findAllByType('Modal').length, 0);
  await unmount();

  let joined = 0, closed = 0;
  const event = { id: 'demo:evento:1', titulo: 'Encontro de exemplo', descricao: 'Descrição de demonstração', local_texto: 'Praça Nereu Ramos', inicia_em: '2026-10-17T12:00:00Z', demonstracao: true, inscrito: false, cancelado: false };
  await mount(React.createElement(EventDetailsSheet, { event, onClose: () => closed++, onParticipate: () => joined++ }));
  assert.ok(text().includes('DEMONSTRAÇÃO')); assert.ok(text().includes('09:00')); assert.ok(text().includes('não há inscrição ou encontro confirmado'));
  await press('Fechar exemplo'); assert.equal(closed, 1); assert.equal(joined, 0);
  await act(async () => renderer.update(React.createElement(EventDetailsSheet, { event: { ...event, id: 'real-event', demonstracao: false, inicia_em: '2099-10-17T12:00:00Z' }, onClose: () => closed++, onParticipate: () => joined++ })));
  await press('Quero participar'); assert.equal(joined, 1);
  await unmount();

  let confirmed = 0;
  await mount(React.createElement(ProfileDialog, { notice: { title: 'Sair da conta?', message: 'Confirme sua escolha.', confirmLabel: 'Sair', confirm: () => confirmed++ }, onClose() {} }));
  await press('Cancelar'); assert.equal(confirmed, 0);
  await press('Sair'); assert.equal(confirmed, 1, 'shared dialog must only confirm on its explicit action');
  await unmount();

  await mount(React.createElement(ProfileDialog, { notice: { title: 'Continuar?', message: 'Confirme.', confirm: () => confirmed++ }, onClose() {} }));
  assert.equal(button('Confirmar').props.label, 'Confirmar');assert.equal(buttons('Sair').length, 0);
  await press('Cancelar');await unmount();
  const { BottomNavigation } = load('components/BottomNavigation.tsx');
  const tabActions=[];
  await mount(React.createElement(BottomNavigation, { addLabel: 'Contribuir', addAccessibilityLabel: 'Contribuir com a cidade', onAction: label => tabActions.push(label), active: 'Mapa' }));
  assert.ok(text().includes('Contribuir'));assert.ok(!text().includes('Relatar'));
  await press('Contribuir com a cidade');assert.deepEqual(tabActions,['Participar']);await unmount();

  const { AccountField, AccountAction, AccountPage } = load('components/AccountForm.tsx');
  const { Field, Action } = load('components/shared/FormControls.tsx');
  let focusCalls = 0, blurCalls = 0, fieldRef = React.createRef();
  await mount(React.createElement(Field, { ref: fieldRef, label: 'Descrição', error: 'Preencha a descrição', onFocus: () => focusCalls++, onBlur: () => blurCalls++ }));
  assert.equal(input('Descrição').props.accessibilityHint, 'Preencha a descrição');
  assert.ok(fieldRef.current, 'shared field forwards its native focus ref');
  await act(async () => input('Descrição').props.onFocus({}));
  await act(async () => input('Descrição').props.onBlur({}));
  assert.equal(focusCalls, 1); assert.equal(blurCalls, 1);
  assert.ok(renderer.root.findAllByType('Text').some(n => n.props.accessibilityRole === 'alert'));
  await unmount();
  await mount(React.createElement(AccountField, { label: 'Senha', password: true, value: 'password', onChangeText() {} }));
  assert.equal(input('Senha').props.secureTextEntry, true);
  await press('Mostrar senha'); assert.equal(input('Senha').props.secureTextEntry, false);
  await press('Ocultar senha'); assert.equal(input('Senha').props.secureTextEntry, true);
  await unmount();
  await mount(React.createElement(AccountAction, { title: 'Salvar', onPress() {}, disabled: true }));
  assert.equal(button('Salvar').props.disabled, true); await unmount();
  await mount(React.createElement(Action, { title: 'Enviar', onPress() {}, busy: true }));
  assert.equal(button('Enviar').props.disabled, true); assert.equal(button('Enviar').props.busy, true); await unmount();
  await mount(React.createElement(AccountPage, { title: 'Informações pessoais' }, React.createElement('Text', null, 'Conteúdo')));
  assert.ok(renderer.root.findAllByType('Text').some(n => n.props.accessibilityRole === 'header'));
  await press('Voltar'); await unmount();

  const { InputField } = load('components/InputField.tsx');
  await mount(React.createElement(InputField, { label: 'Senha de acesso', password: true, icon: 'lock-closed-outline', editable: false, error: 'Confira sua senha' }));
  assert.equal(input('Senha de acesso').props.accessibilityState.disabled, true);
  assert.equal(button('Mostrar senha').props.disabled, true);
  assert.equal(input('Senha de acesso').props.accessibilityHint, 'Confira sua senha');
  assert.ok(renderer.root.findAllByType('Text').some(n => n.props.accessibilityRole === 'alert'));
  await unmount();
  await mount(React.createElement(Field, { label: 'Nome', success: 'Nome válido' }));
  assert.equal(input('Nome').props.accessibilityHint, 'Nome válido');
  assert.ok(text().includes('Nome válido'));
  await unmount();
  // Lint protects future screens from drifting away from the shared language.
  const { Linter } = require('eslint');
  const linter = new Linter();
  const rule = require('../eslint-rules/design-system.cjs');
  const checkDesign = code => linter.verify(code, [{ plugins: { elas: { rules: { design: rule } } }, rules: { 'elas/design': 'error' } }]);
  assert.equal(checkDesign('const style = { color: "#123456", fontSize: 10, borderRadius: 17 };').length, 3);
  assert.equal(checkDesign('const style = { color: palette.text, fontSize: typography.body, borderRadius: radius.medium };').length, 0);

  const { PlaceCard } = load('components/map/PlaceCard.tsx');
  const currentPlace = { ...place, latitude: -28.68, longitude: -49.37, status: 'unknown', source: 'osm', externalRef: 'node/123', photoUrl: 'https://example.com/photo.jpg', photoAuthor: 'Fotógrafa', photoLicense: 'CC BY-SA 4.0', photoSource: 'https://example.com/source' };
  let reviewed, detailClosed = 0;
  const card = (selected = currentPlace) => React.createElement(PlaceCard, { place: selected, expanded: true, onReview: p => reviewed = p.id, onClose: () => detailClosed++ });
  await mount(card());
  assert.ok(text().includes('0 m'));assert.ok(text().includes('Fotógrafa'));
  assert.equal(renderer.root.findAllByType('Image').length, 1);
  await press('Ver fonte da foto');await press('Ver licença CC BY-SA 4.0');
  await press('Como chegar');await press('Solicitar melhoria aqui');
  assert.equal(navigations.at(-1).pathname, '/impactos');assert.equal(navigations.at(-1).params.placeId, 'nereu');
  await press('Informar dados incorretos');assert.equal(navigations.at(-1).params.correction, '1');
  await press('Avaliar Praça Nereu Ramos');assert.equal(reviewed, 'nereu');
  await act(async () => renderer.root.findByType('Image').props.onError());
  assert.ok(text().includes('Ainda sem foto deste lugar'));
  await act(async () => renderer.update(card({ ...currentPlace, id: 'other-place' })));
  assert.equal(renderer.root.findAllByType('Image').length, 1, 'a new place resets media failure');
  await press('Fechar detalhes do local');assert.equal(detailClosed, 1);await unmount();

  const { PollCard } = load('components/events/PollCard.tsx');
  const openPoll = { id:'poll-one', pergunta:'Qual prioridade?', encerra_em:'2099-01-01T00:00:00Z', encerrada:false, resultados_visiveis:false, minha_opcao:null,
    opcoes:[{id:'light',texto:'Iluminação',ordem:0,votos:null},{id:'access',texto:'Acessibilidade',ordem:1,votos:null}] };
  let voteRequest, voteCalls=0, refreshed=0;
  const sendVote=option=>new Promise((resolve,reject)=>{voteCalls++;voteRequest={option,resolve,reject};});
  const pollProps={poll:openPoll,onVote:sendVote,onRefresh:()=>refreshed++};
  await mount(React.createElement(PollCard,pollProps));
  assert.ok(!text().includes('%'));assert.equal(renderer.root.findAllByType('Progress').length,0);
  assert.ok(buttons('Iluminação').length);assert.ok(!text().includes('0 votos'),'hidden aggregates must not be portrayed as zero');
  await press('Votar');assert.ok(text().includes('Selecione uma opção'));assert.equal(voteCalls,0);
  await press('Iluminação');await press('Votar');assert.equal(voteRequest.option,'light');assert.equal(voteCalls,1);
  assert.equal(button('Votar').props.busy,true);
  await act(async()=>button('Votar').props.onPress());assert.equal(voteCalls,1,'pending vote is locked against duplicate sends');
  await act(async()=>voteRequest.reject(new Error('Conexão indisponível')));
  assert.ok(text().includes('Conexão indisponível'));assert.ok(!text().includes('%'));assert.ok(!text().includes('Voto salvo'));
  await press('Votar');await act(async()=>voteRequest.resolve());
  assert.ok(text().includes('Voto salvo'));assert.ok(!text().includes('%'),'local receipt alone must not invent results');
  await press('Atualizar resultados');assert.equal(refreshed,1);
  const votedPoll={...openPoll,resultados_visiveis:true,minha_opcao:'light',opcoes:openPoll.opcoes.map((o,i)=>({...o,votos:i?3:1}))};
  await act(async()=>renderer.update(React.createElement(PollCard,{...pollProps,poll:votedPoll})));
  assert.ok(text().includes('25% dos votos'));assert.ok(text().includes('75% dos votos'));
  assert.equal(renderer.root.findAllByType('Progress').length,2);
  assert.equal(button('Iluminação, 25% dos votos').props.checked,true);
  await unmount();
  await mount(React.createElement(PollCard,{poll:{...votedPoll,minha_opcao:null,encerrada:true}}));
  assert.ok(text().includes('VOTAÇÃO ENCERRADA'));assert.ok(text().includes('25% dos votos'));
  assert.equal(button('Votação encerrada').props.disabled,true);await unmount();
  await mount(React.createElement(PollCard,{poll:{...openPoll,encerra_em:'2000-01-01'},onRefresh:()=>refreshed++}));
  assert.ok(!text().includes('%'),'device time alone cannot unlock hidden data');await press('Atualizar resultados');await unmount();
  await mount(React.createElement(PollCard,{poll:openPoll}));await press('Iluminação');await press('Votar');
  assert.ok(text().includes('Não foi possível enviar o voto'));assert.ok(!text().includes('Voto salvo'));await unmount();
  await mount(React.createElement(PollCard,{}));assert.ok(!text().includes('%'));await press('Iluminação');await press('Votar');
  assert.ok(text().includes('Demonstração: seu voto não foi enviado'));assert.ok(text().includes('% dos votos'));await unmount();

  const schedule = eventSchedule('2026-10-15T00:30:00Z');
  assert.equal(schedule.day, '14'); assert.equal(schedule.month, 'OUT'); assert.equal(schedule.time, '21:30');
  assert.equal(eventSchedule('invalid', 'Até 30/12').date, 'Até 30/12');
  console.log('App flow checks passed: neutral poll UI/results/receipt/failure/change/end/demo, one sheet per task, place selection/back, inline validation/focus, draft preservation, routed-place loading, one send per double tap, complete request payload, retry, success tracking, isolated demo events and real action, confirm/cancel, shared field refs/errors/password/focus, disabled/busy actions, accessible page header, São Paulo event dates.');
} finally { console.error = originalError; }
