process.env.EXPO_PUBLIC_MAP_TILE_MODE = 'pilot';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { initialMapRegion, places, normalizePlaceQuery } from '../constants/places.ts';
import * as categories from '../constants/placeCategories.ts';
import * as regions from '../features/map/region.ts';
import * as viewport from '../features/map/viewport.ts';
import * as relevance from '../constants/placeRelevance.ts';
import { createFrameScheduler } from '../features/map/frameScheduler.ts';

// Mount the real map screen, catalog hook and web map. Native views are hosts;
// layout is driven explicitly, so this is a React regression test, not visual QA.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url), timers = new Map();
let timerId = 0;
const schedule = (fn, ms = 0) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
const clear = id => timers.delete(id);
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
const pending = []; let requests = 0;
const loadNearby = () => { requests++; return new Promise(resolve => pending.push(resolve)); };
const catalog = { places, error: '', reload: async () => {}, loadNearby };
const noop = () => {};
const native = {
  View: 'View', Text: 'Text', TextInput: 'TextInput', ScrollView: 'ScrollView', Image: 'Image',
  FlatList: 'FlatList', ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable',
  Platform: { OS: 'web' }, StyleSheet: { create: x => x, absoluteFill: {}, absoluteFillObject: {} },
  Keyboard: { dismiss: noop }, BackHandler: { addEventListener: () => ({ remove: noop }) },
  PanResponder: { create: x => ({ panHandlers: x }) },
};
const router = { push: noop, setParams: noop };
const hosts = name => props => React.createElement(name, props, props.children);
const hostNames = ['MapFilters','PlaceCard','MapLoadingPopup','ProfileDialog','TouchFeedback','MotionReveal','PlaceRow','PlaceMarker','MapAttribution','ReportMarker'];
const mocks = {
  '../../components/loading/LoadingState':{LoadingState:hosts('LoadingState')},
  '../../components/loading/LoadingIndicator':{LoadingIndicator:hosts('LoadingIndicator')},
  'react': React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
  'expo-router': { router, useFocusEffect: effect => React.useEffect(effect, [effect]), useLocalSearchParams: () => ({}) },
  'expo-status-bar': { StatusBar: hosts('StatusBar') },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '../../components/shared/FeaturePage': {FeaturePage:hosts('FeaturePage'),Action:hosts('Action'),Message:()=>null,shared:{note:{}}},
  '../lib/supabase': {backendConfigured:true,friendlyError:String},
  '../../lib/supabase': { backendConfigured: true, friendlyError: String },
  './CatalogProvider': { useCatalog: () => catalog },
  './LocationProvider': { useLocation: () => ({ userLocation: null, setUserLocation: noop }) },
  './location': { captureLocation: async () => ({ latitude: 0, longitude: 0 }) },
  './useMapReports': { useMapReports: () => ({ rows: [], nodes:[], total:0, error: '', retry: noop }) },
  './useServiceAreas': {useServiceAreas:()=>({area:{id:'criciuma',nome:'Criciúma',estado:'SC',region:initialMapRegion},rows:[],choose:noop,loading:false,error:'',retry:noop})},
  './ServiceAreaSelector':{ServiceAreaSelector:()=>null},
  './usePlaceSearch': { usePlaceSearch: () => ({ rows: [], more: noop }) },
  './useMapSelection': { useMapSelection: () => {
    const [expanded, setExpanded] = React.useState(false);
    return { selected: places[0], selectedReport: null, expanded, setExpanded, groupPlaces: null,
      clear: noop, choose: noop, setGroupPlaces: noop, chooseReport: noop };
  } },
  './region': regions,
  './viewport': viewport,
  '../../features/map/viewport': viewport,
  '../../features/map/frameScheduler': { createFrameScheduler },
  '../../constants/placeRelevance': relevance,
  '../../constants/placeCategories': categories,
  '../../constants/places': { initialMapRegion, normalizePlaceQuery },
  '../../constants/theme': load('../constants/theme.ts'),
};
function load(file, additions = {}) {
  const source = file.startsWith('file:') ? new URL(file) : process.env.ELAS_MAP_TEST_SOURCE ? new URL(file.slice(3), pathToFileURL(process.env.ELAS_MAP_TEST_SOURCE.replace(/\/$/, '') + '/')) : new URL(file, import.meta.url);
  const code = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const resolve = name => {
    if (name in additions) return additions[name];
    if (name in mocks) return mocks[name];
    const host = hostNames.find(key => name.endsWith('/' + key));
    if (host) return { [host]: hosts(host) };
    if (name.endsWith('/Ionicon')) return { default: hosts('Icon') };
    if (name.startsWith('.')) {
      const relative = new URL(name, source);
      const file = [relative, new URL(relative.href + '.tsx'), new URL(relative.href + '.ts')].find(candidate => fs.existsSync(candidate));
      if (file) return load(file.href);
    }
    throw new Error('Unmocked import ' + name);
  };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', code)(
    resolve, module, module.exports, schedule, clear, fn => schedule(fn, 16), clear,
  );
  return module.exports;
}
const useCatalogRegion = load('../features/map/useCatalogRegion.ts').useCatalogRegion;
const CityMap = load('../components/map/CityMap.tsx').default;
const Screen = load('../features/map/MapScreen.tsx', { './useCatalogRegion': { useCatalogRegion }, '../../components/map/CityMap': { default: CityMap } }).default;
let renderer;
await act(async () => { renderer = TestRenderer.create(React.createElement(Screen)); });
const text = node => node.findAllByType('Text').map(n => n.children.filter(x => typeof x === 'string').join('')).join(' ');
function controls() {
  return renderer.root.findAll(n => n.type === 'View' && n.props.onLayout && n.findAllByType('TextInput').length === 1).at(-1);
}
async function layout() {
  await act(async () => {
    const measured = controls();
    // Before the fix the measured area included these transient rows, feeding
    // their height back into map padding and triggering another area request.
    const height = 100 + (/Atualizando lugares/.test(text(measured)) ? 40 : 0) + (/Sobre a área/.test(text(measured)) ? 48 : 0);
    measured.props.onLayout({ nativeEvent: { layout: { height } } });
    const map = renderer.root.findByType(CityMap.type);
    map.props.onLoadStateChange('ready');
    map.findAll(n => n.type === 'View' && n.props.onLayout)[0].props.onLayout({ nativeEvent: { layout: { width: 390, height: 600 } } });
  });
}
async function advanceRequests() {
  await act(async () => {
    for (const [id, timer] of [...timers]) if (timer.ms <= 1000) { timers.delete(id); timer.fn(); }
    await Promise.resolve();
  });
  await layout(); // ResizeObserver may fire while the network is still pending.
  await act(async () => {
    for (const resolve of pending.splice(0)) resolve({ count: places.length, warning: 'Uma atualização do catálogo está em andamento.' });
    await Promise.resolve();
  });
  await layout(); // And again when loading finishes and the notice appears.
}

for (let i = 0; i < 12; i++) { await layout(); await advanceRequests(); }
const settledRequests = requests;
assert.ok(settledRequests <= 3, `selection must settle, got ${requests} requests`);
assert.ok(text(renderer.root).includes('Sobre a área'));
assert.ok(!text(renderer.root).includes('Atualizando lugares'));
assert.ok(!text(controls()).includes('Sobre a área'), 'feedback must not alter measured control height');
for (let i = 0; i < 20; i++) { await layout(); await advanceRequests(); }
assert.equal(requests, settledRequests, 'finished requests must not reframe and refetch the same place');
const map = renderer.root.findByType(CityMap.type), current = map.props.region;
await act(async () => { map.props.onRegionChange({ ...current, latitude: current.latitude + 1e-10 }); });
await advanceRequests();
assert.equal(requests, settledRequests, 'sub-centimetre map callback noise must not refetch');
await act(async () => { renderer.root.findByType(CityMap.type).props.onRegionChange({ ...current, latitude: current.latitude + .003 }); });
await advanceRequests();
assert.equal(requests, settledRequests + 1, 'a real pan must still fetch its area');
// Selecting a category no longer adds the loose counter under Sobre a área.
const parks = renderer.root.findAll(n => n.type === 'TouchFeedback' && n.props.label === 'Filtrar Parques')[0];
await act(async () => parks.props.onPress()); await advanceRequests();
assert.ok(!text(renderer.root).includes('nesta área'), 'the redundant category counter should stay removed');
await act(async () => renderer.unmount());
console.error = originalError;
console.log(`Mounted map regression passed: selection settles after ${settledRequests} requests, 20 load/layout cycles stay stable, background indicator absent, real pan and category changes still work.`);
