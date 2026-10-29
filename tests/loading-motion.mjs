import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : name === 'react' ? React : require(name), module, module.exports);
  return module.exports;
}
let reduced = false, lifecycle, subscriptionRemoved = false, motion, renderer;
const loops = [], timings = [];
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate(config) { return config; } }
const native = {
  View: 'View', Text: 'Text', ScrollView: 'ScrollView', StyleSheet: { create: x => x, absoluteFill: {} },
  Platform: { OS: 'android' }, Easing: { linear: x => x },
  AppState: { currentState: 'active', addEventListener: (_, handler) => { lifecycle = handler; return { remove() { subscriptionRemoved = true; } }; } },
  Animated: { Value, View: 'AnimatedView', timing: (_, config) => { timings.push(config); return config; }, loop: () => { const entry = { started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } }; loops.push(entry); return entry; } },
};
const NavigationContext = React.createContext(undefined);
const { useLoadingMotion } = load('../hooks/useLoadingMotion.ts', { '@react-navigation/native': { NavigationContext }, 'react-native': native, './useReducedMotion': { useReducedMotion: () => reduced } });
function Probe({ active = true }) { motion = useLoadingMotion(active); return null; }
try {
  await act(async () => { renderer = TestRenderer.create(React.createElement(Probe)); });
  assert.equal(motion.moving, true); assert.equal(loops.length, 1); assert.equal(loops[0].started, true);
  assert.equal(timings[0].useNativeDriver, true); assert.equal(timings[0].isInteraction, false, 'animation must not block virtualized lists');
  await act(async () => renderer.update(React.createElement(Probe)));
  assert.equal(loops.length, 1, 'ordinary renders cannot restart loading');
  await act(async () => lifecycle('background'));
  assert.equal(motion.moving, false); assert.equal(loops[0].stopped, true);
  await act(async () => lifecycle('active')); assert.equal(loops.length, 2);
  reduced = true; await act(async () => renderer.update(React.createElement(Probe)));
  assert.equal(motion.moving, false); assert.equal(loops[1].stopped, true);
  reduced = false; await act(async () => renderer.update(React.createElement(Probe, { active: false })));
  assert.equal(loops.length, 2, 'hidden popup cannot start another loop');
  await act(async () => renderer.update(React.createElement(Probe, { active: true })));
  assert.equal(loops.length, 3);
  await act(async () => renderer.unmount()); assert.equal(loops[2].stopped, true); assert.equal(subscriptionRemoved, true);
  native.Platform.OS = 'web';
  await act(async () => { renderer = TestRenderer.create(React.createElement(Probe)); });
  assert.equal(timings.at(-1).useNativeDriver, false);
  await act(async () => renderer.unmount());

  let focused = false;
  const navigationEvents = new Map();
  const navigation = { isFocused: () => focused, addListener: (name, callback) => { navigationEvents.set(name, callback); return () => navigationEvents.delete(name); } };
  const base = loops.length;
  await act(async () => { renderer = TestRenderer.create(React.createElement(NavigationContext.Provider, { value: navigation }, React.createElement(Probe))); });
  assert.equal(motion.moving, false); assert.equal(loops.length, base, 'hidden stack screen cannot animate');
  await act(async () => { focused = true; navigationEvents.get('focus')(); });
  assert.equal(loops.length, base + 1);
  await act(async () => { focused = false; navigationEvents.get('blur')(); });
  assert.equal(loops.at(-1).stopped, true);
  await act(async () => renderer.unmount()); assert.equal(navigationEvents.size, 0);

  const theme = load('../constants/theme.ts');
  const svg = Object.fromEntries(['default', 'Circle', 'Path', 'Rect'].map(name => [name, name === 'default' ? 'Svg' : name]));
  const { CityPulse } = load('../components/loading/CityPulse.tsx', {
    'react-native': native, 'react-native-svg': { ...svg, __esModule: true }, '../../constants/theme': theme,
    '../../hooks/useLoadingMotion': { useLoadingMotion: () => ({ phase: new Value(0), moving: false }) },
  });
  await act(async () => { renderer = TestRenderer.create(React.createElement(CityPulse)); });
  const frame = renderer.root.findAllByType('View').find(node => node.props.onLayout);
  await act(async () => frame.props.onLayout({ nativeEvent: { layout: { width: 216 } } }));
  assert.equal(frame.props.style.height, 216 * 220 / 280);
  const scene = renderer.root.findByProps({ testID: 'city-pulse-scene' });
  assert.equal(scene.props.style[1].transform[0].scale, 216 / 280, 'small phones must contain the full illustration');
  assert.equal(scene.props.importantForAccessibility, 'no-hide-descendants');
  await act(async () => renderer.update(React.createElement(CityPulse, { compact: true })));
  assert.equal(renderer.root.findByProps({ testID: 'city-pulse-compact' }).findAllByType('AnimatedView').length, 3);
  await act(async () => renderer.unmount());

  const { LoadingState } = load('../components/loading/LoadingState.tsx', { 'react-native': native, '../../constants/theme': theme, './ListSkeleton': { ListSkeleton: 'ListSkeleton' }, '../Logo': { Logo: 'Logo' }, './CityPulse': { CityPulse: 'CityPulse' } });
  await act(async () => { renderer = TestRenderer.create(React.createElement(LoadingState, { fullScreen: true, title: 'Abrindo seu ELAS' })); });
  const status = renderer.root.findByProps({ accessibilityRole: 'progressbar' });
  assert.equal(status.props.accessibilityLabel, 'Abrindo seu ELAS'); assert.equal(status.props.accessibilityState.busy, true);
  assert.equal(renderer.root.findAllByType('ScrollView').length, 1, 'large text can scroll on short screens');
  assert.equal(renderer.root.findAllByType('CityPulse').length,1,'opening uses a single motion clock');
  await act(async () => renderer.update(React.createElement(LoadingState, { fullScreen: false })));
  assert.equal(renderer.root.findAllByType('ListSkeleton').length,1);
  assert.equal(renderer.root.findByType('CityPulse').props.compact,true,'lists use compact motion rather than a full city scene');
  await act(async () => renderer.unmount());
  console.log('Loading motion: lifecycle, stable loop, native/web driver, reduced motion, responsive art and accessibility passed.');
} finally { console.error = originalError; }
