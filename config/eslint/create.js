import { defineESLintConfig } from '@ocavue/eslint-config'

/**
 * The one place the repo's ESLint rules are defined. Two entry points wrap it:
 * `bun.js` (React on) and `server.js` (React off).
 *
 * The split exists because the React preset loads two React plugin sets
 * (`react-hooks/*` and `@eslint-react/*`) that misfire on server-only code —
 * e.g. `@eslint-react/purity` reads any factory returning a closure as a hook.
 * Rules that cannot apply should not be loaded.
 *
 * @param {{ react: boolean }} options
 */
export function createConfig({ react }) {
  return defineESLintConfig(
    {
      react,
      markdown: false,
    },
    {
      languageOptions: { globals: { Bun: true } },
    },
    {
      rules: {
        '@typescript-eslint/consistent-type-definitions': 'off',
        // Single-line JSDoc (`/** Foo */`) is the house style here
        'jsdoc/multiline-blocks': 'off',
        // Prettier lowercases hex digits; align unicorn so they don't fight.
        'unicorn/number-literal-case': [
          'error',
          { hexadecimalValue: 'lowercase' },
        ],
        // SQL is built only from drizzle's parameterised `sql` template.
        // `sql.raw` splices a string verbatim; a genuine need is a one-line
        // disable with the reason the input is not user-controlled.
        'no-restricted-properties': [
          'error',
          {
            object: 'sql',
            property: 'raw',
            message:
              'sql.raw splices its argument unescaped. Use the sql`` template, or disable with the reason the input is not user-controlled.',
          },
        ],
        'no-restricted-syntax': [
          'error',
          {
            selector: "TSQualifiedName[left.name='React']",
            message:
              "Import the type directly from 'react' (e.g. `import { type FormEvent } from 'react'`) rather than React.X.",
          },
        ],
      },
    },
    // Raw HTML from anything a user or model can influence is XSS.
    react
      ? {
          files: ['**/*.tsx', '**/*.jsx'],
          rules: {
            '@eslint-react/dom-no-dangerously-set-innerhtml': 'error',
          },
        }
      : {},
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        // `await expect(p).rejects.toThrow()` is typed as void by @types/bun
        // even though it returns a promise.
        '@typescript-eslint/await-thenable': 'off',
      },
    },
    { ignores: ['knip.ts', 'eslint.config.js'] },
  )
}
