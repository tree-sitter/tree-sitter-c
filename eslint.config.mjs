import treesitter from 'eslint-config-treesitter';

export default [
  ...treesitter.map(config => ({...config, files: ['grammar.mjs', 'grammar-helpers.mjs']})),
  {
    files: ['grammar.mjs', 'grammar-helpers.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        rule: 'readonly',
        external: 'readonly',
        RustRegex: 'readonly',
      },
    },
    rules: {
      // Grammar bindings preserve public node names, including underscores.
      camelcase: 'off',
      'one-var': 'off',
    },
  },
];
