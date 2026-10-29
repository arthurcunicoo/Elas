import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {administrationScreens, isAdministrator, normalizeRole} from '../features/auth/authorization.ts';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url), root = path.resolve(import.meta.dirname, '..');
const originalError = console.error;
console.error = (...args) => {
  if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args);
};
const host = name => props => React.createElement(name, props, props.children);
let session = {user: {id: 'A', user_metadata: {nome: 'Pessoa'}}};
let permissions = {role: 'usuario', ready: true, refresh: async () => {}};
let route = '/mapa', configured = true, renderer;
const listeners = new Set();
class Value {
  interpolate() {return 1;}
  stopAnimation() {}
  setValue() {}
}
const native = {
  AppState: {currentState: 'active', addEventListener: (_event, callback) => {
    listeners.add(callback); return {remove: () => listeners.delete(callback)};
  }},
  StyleSheet: {create: value => value}, View: 'View', Text: 'Text', ScrollView: 'ScrollView',
  Platform: {OS: 'web'}, Animated: {Value, View: 'AnimatedView'},
};
const navigation = {};
const Stack = host('Stack');
// Keep blocked groups visible to assertions: these tests inspect the actual
// Expo Router guard contract, without pretending to execute native navigation.
Stack.Protected = host('Protected'); Stack.Screen = host('Route');
const router = {push() {}, replace() {}};
const mocks = {
  'react-native': native,
  'expo-router': {Stack, router, usePathname: () => route, useSegments: () => route.slice(1).split('/'),
    useNavigationContainerRef: () => navigation, useGlobalSearchParams: () => ({}), useFocusEffect: fn => React.useEffect(fn, [fn])},
  'expo-status-bar': {StatusBar: host('StatusBar')},
  'react-native-safe-area-context': {SafeAreaProvider: host('SafeArea')},
  '@react-navigation/native': {DefaultTheme: {colors: {}}, ThemeProvider: host('Theme')},
  'lib/monitoring/index.ts': {withMonitoring: value => value, navigationIntegration: {registerNavigationContainer() {}}, setMonitoringRoute() {}},
  'lib/supabase.ts': {get backendConfigured() {return configured;}, configError: '', friendlyError: () => 'Falha de conexão'},
  'lib/appMode.ts': {showcaseEnabled: false},
  'providers/AppData.tsx': {AppDataProvider: host('AppData')},
  'features/auth/SessionProvider.tsx': {useSession: () => ({session, ready: true, error: ''})},
  'features/profile/ProfileProvider.tsx': {useProfile: () => permissions},
  'features/auth/SchemaGate.tsx': {SchemaGate: host('SchemaGate')},
  'features/map/CatalogProvider.tsx': {useCatalog: () => ({places: []})},
  'features/community/PushLifecycle.tsx': {PushLifecycle: host('PushLifecycle')},
  'features/community/notifications.ts': {unreadCount: async () => 0},
  'features/community/useParticipation.ts': {useParticipation: () => ({data: null, error: ''})},
  'features/reports/drafts.ts': {clearAccountDrafts: async () => {}},
  'features/map/onboardingEvent.ts': {resetOnboarding() {}},
  'hooks/useReducedMotion.ts': {useReducedMotion: () => true},
  'services/account.ts': {signOut: async () => {}},
};
for (const [file, name] of [
  ['components/loading/LoadingState.tsx', 'LoadingState'], ['components/ParticipationSheet.tsx', 'ParticipationSheet'],
  ['components/BottomNavigation.tsx', 'BottomNavigation'], ['components/CitySkyline.tsx', 'CitySkyline'],
  ['components/WebFormStyles.tsx', 'WebFormStyles'], ['components/ProfileHeader.tsx', 'ProfileHeader'],
  ['components/AchievementCard.tsx', 'AchievementCard'], ['components/ProfileMenuItem.tsx', 'ProfileMenuItem'],
  ['components/ProfileDialog.tsx', 'ProfileDialog'], ['components/MotionReveal.tsx', 'MotionReveal'],
]) mocks[file] = {[name]: host(name)};
function loader(overrides = {}) {
  const cache = new Map(), registry = {...mocks, ...overrides};
  function load(relative) {
    if (relative in registry && registry[relative] !== undefined) return registry[relative];
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = path.join(root, relative), module = {exports: {}};
    cache.set(relative, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022},
    }).outputText;
    new Function('require', 'module', 'exports', code)(name => {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return require(name);
      if (name in registry) return registry[name];
      assert.ok(name.startsWith('.'), `Unmocked dependency ${name}`);
      const base = path.resolve(path.dirname(filename), name);
      const found = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
      assert.ok(found, name);
      return load(path.relative(root, found));
    }, module, module.exports);
    return module.exports;
  }
  return load;
}
const mount = async Component => act(async () => {renderer = TestRenderer.create(React.createElement(Component));});
const unmount = async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = undefined;
};
const adminGroup = () => renderer.root.findAllByType('Protected').find(group =>
  group.findAllByType('Route').some(screen => screen.props.name === 'admin'));
const menu = () => renderer.root.findAllByType('ProfileMenuItem').filter(item => item.props.title === 'Administração');
try {
  const load = loader(), Layout = load('app/_layout.tsx').default, Profile = load('app/perfil.tsx').default;
  for (const role of ['usuario', 'moderador', null, undefined, '', 'ADMIN', 'owner', 'admin']) {
    permissions = {role, ready: true, refresh: async () => {}};
    assert.equal(isAdministrator(role), role === 'admin');
    assert.equal(normalizeRole(role), role === 'admin' || role === 'moderador' ? role : 'usuario');
    await mount(Layout);
    assert.equal(adminGroup().props.guard, role === 'admin', `route protection for ${String(role)}`);
    assert.deepEqual(adminGroup().findAllByType('Route').map(screen => screen.props.name), [...administrationScreens]);
    await unmount();
    await mount(Profile); assert.equal(menu().length, role === 'admin' ? 1 : 0); await unmount();
  }
  permissions = {role: 'admin', ready: true, refresh: async () => {}};
  for (const state of [{session: null, configured: true}, {session, configured: false}]) {
    const previous = session; session = state.session; configured = state.configured;
    await mount(Layout); assert.equal(adminGroup().props.guard, false); await unmount();
    await mount(Profile); assert.equal(menu().length, 0); await unmount();
    session = previous; configured = true;
  }
  for (const screen of administrationScreens) {
    route = `/${screen}`; permissions = {role: 'usuario', ready: false};
    await mount(Layout);
    assert.equal(renderer.root.findAllByType('LoadingState').length, 1, 'deep link waits for permissions');
    assert.equal(renderer.root.findAllByType('Stack').length, 0);
    permissions = {role: 'admin', ready: true};
    await act(async () => renderer.update(React.createElement(Layout)));
    assert.equal(adminGroup().props.guard, true);
    permissions = {role: 'usuario', ready: true};
    await act(async () => renderer.update(React.createElement(Layout)));
    assert.equal(adminGroup().props.guard, false, 'revocation removes the protected group');
    await unmount();
  }
  route = '/mapa'; permissions = {role: 'usuario', ready: false};
  await mount(Layout); assert.equal(renderer.root.findAllByType('LoadingState').length, 0, 'ordinary routes remain usable'); await unmount();

  // Actual profile service: malformed RPC results never become privileged roles.
  let rawRole, roleError;
  const db = {
    from: () => ({upsert: async () => ({error: null}), select: () => ({eq: () => ({single: async () => ({data: {nome: 'Pessoa', avatar_url: null}, error: null})})})}),
    rpc: async () => ({data: rawRole, error: roleError}),
  };
  const service = loader({'lib/supabase.ts': {requireBackend: () => db}, 'features/profile/avatar.ts': {avatarDisplay: async value => value}})('services/profile.ts');
  for (const role of ['usuario', 'moderador', 'admin', null, undefined, 'owner', {role: 'admin'}]) {
    rawRole = role; roleError = null;
    assert.equal((await service.loadProfile('A', 'Pessoa')).role, normalizeRole(role));
  }
  rawRole = 'admin'; roleError = new Error('private details');
  const failed = await service.loadProfile('A', 'Pessoa');
  assert.equal(failed.role, 'usuario'); assert.ok(!failed.error.includes('private details'));

  // Actual provider: permission readiness, in-flight account switch, sign-out,
  // foreground revalidation and out-of-order completion.
  const pending = [];
  const provider = loader({
    'features/profile/ProfileProvider.tsx': undefined,
    'services/profile.ts': {loadProfile: id => new Promise((resolve, reject) => pending.push({id, resolve, reject}))},
  });
  const {ProfileProvider, useProfile} = provider('features/profile/ProfileProvider.tsx');
  let snapshot;
  function Probe() {snapshot = useProfile(); return null;}
  function Tree() {return React.createElement(ProfileProvider, null, React.createElement(Probe));}
  const result = role => ({profile: {nome: 'Pessoa', avatar_url: null}, role, error: ''});
  session = {user: {id: 'A', user_metadata: {role: 'admin'}}};
  await mount(Tree);
  assert.equal(snapshot.ready, false); assert.equal(snapshot.role, 'usuario', 'user metadata cannot authorize');
  await act(async () => pending.at(-1).resolve(result('admin')));
  assert.equal(snapshot.ready, true); assert.equal(snapshot.role, 'admin');
  let refresh;
  await act(async () => {refresh = snapshot.refresh();});
  const stale = pending.at(-1);
  session = {user: {id: 'B', user_metadata: {}}};
  await act(async () => renderer.update(React.createElement(Tree)));
  const latest = pending.at(-1);
  assert.equal(latest.id, 'B'); assert.equal(snapshot.ready, false); assert.equal(snapshot.role, 'usuario');
  await act(async () => {stale.resolve(result('admin')); await refresh;});
  assert.equal(snapshot.ready, false); assert.equal(snapshot.role, 'usuario', 'old account cannot restore privileges');
  await act(async () => latest.resolve(result('usuario')));
  assert.equal(snapshot.ready, true);
  await act(async () => {refresh = snapshot.refresh();});
  const signedOut = pending.at(-1);
  session = null;
  await act(async () => renderer.update(React.createElement(Tree)));
  await act(async () => {signedOut.resolve(result('admin')); await refresh;});
  assert.equal(snapshot.role, 'usuario'); assert.equal(snapshot.ready, true);
  session = {user: {id: 'C', user_metadata: {}}};
  await act(async () => renderer.update(React.createElement(Tree)));
  await act(async () => pending.at(-1).reject(new Error('private backend error')));
  assert.equal(snapshot.ready, true); assert.equal(snapshot.role, 'usuario');
  assert.equal(snapshot.error, 'Falha de conexão');
  const emit = value => {native.AppState.currentState = value; for (const listener of listeners) listener(value);};
  const before = pending.length;
  await act(async () => {emit('background'); emit('active'); emit('active');});
  assert.equal(pending.length, before + 1, 'one revalidation per foreground transition');
  await act(async () => pending.at(-1).resolve(result('admin')));
  assert.equal(snapshot.role, 'admin');
  await act(async () => {emit('background'); emit('active');});
  await act(async () => pending.at(-1).resolve(result('usuario')));
  assert.equal(snapshot.role, 'usuario', 'revocation is reflected after revalidation');
  await unmount(); assert.equal(listeners.size, 0);
} finally {
  if (renderer) await unmount();
  console.error = originalError;
}
console.log('Administration access passed: real menu/route guards, default-deny malformed roles, signed-out/demo exclusion and deep-link readiness. Native navigation remains a device/staging check.');
