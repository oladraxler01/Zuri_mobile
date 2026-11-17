// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** Raw colour literals. The design system says colours come only from tokens. */
const noHexColours = {
  selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message: 'Use a colour token from useTheme() instead of a hex literal (zuri-design-system skill).',
};

/**
 * Rules the existing screens break (found when lint was first added). They're
 * warnings app-wide so CI can gate on errors today; each area turns them back
 * into errors when it's cleaned up, in the "clean areas" block below.
 */
const PRE_EXISTING = {
  'react-hooks/refs': 'warn',
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/purity': 'warn',
  'react-hooks/static-components': 'warn',
  'react-hooks/immutability': 'warn',
  'react/no-unescaped-entities': 'warn',
};
const promote = (rules) => Object.fromEntries(Object.keys(rules).map((k) => [k, 'error']));

/** Areas on tokens and clean of the rules above. Add each area here as it migrates. */
const CLEAN_AREAS = ['src/theme/**/*.{ts,tsx}', 'src/app/dev/**/*.{ts,tsx}'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'coverage/*', 'src/theme/tokens.ts'],
  },
  {
    rules: {
      ...PRE_EXISTING,
      // TypeScript already checks namespace members, and this rule misreads
      // expo-notifications' re-exports (AndroidImportance).
      'import/namespace': 'off',
    },
  },
  {
    // Warn everywhere in screens and components while they migrate.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['warn', noHexColours] },
  },
  {
    // On tokens, not yet clean of the pre-existing hook rules: hex literals are errors.
    files: [
      'src/app/onboarding/**/*.{ts,tsx}',
      'src/components/onboarding/**/*.{ts,tsx}',
      'src/app/(tabs)/index.tsx',
      'src/components/lecture/lecture-card.tsx',
      'src/components/planner/assessment-card.tsx',
      'src/components/zuri-bottom-tab-bar.tsx',
    ],
    rules: { 'no-restricted-syntax': ['error', noHexColours] },
  },
  {
    files: CLEAN_AREAS,
    rules: { ...promote(PRE_EXISTING), 'no-restricted-syntax': ['error', noHexColours] },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', 'jest.setup.ts'],
    languageOptions: {
      globals: { describe: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  },
]);
