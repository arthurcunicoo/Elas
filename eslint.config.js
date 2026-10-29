const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const designSystem = require('./eslint-rules/design-system.cjs');
const dataBoundary = require('./eslint-rules/data-boundary.cjs');
module.exports = defineConfig([
  expo,
  { ignores: ['dist/**', 'supabase/functions/**', 'tests/**', 'scripts/**', 'lib/database.types.ts'] },
  { files: ['app/**/*.tsx', 'components/**/*.tsx', 'features/**/*.tsx'], plugins: { elas: { rules: { 'design-system': designSystem, 'data-boundary': dataBoundary } } }, rules: { 'elas/design-system': 'error', 'elas/data-boundary': 'error' } },
]);
