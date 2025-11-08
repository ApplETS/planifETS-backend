module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'import', 'simple-import-sort'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'airbnb-typescript/base',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', "package.json", "node_modules/"],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    complexity: ['warn', { max: 10 }],
    complexity: ['error', { max: 15 }],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        overrides: {
          constructors: 'no-public',
        },
      },
    ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    // prefer ESLint formatting rules (block-spacing) over Prettier enforcement
    'block-spacing': ['error', 'always'],
    '@typescript-eslint/brace-style': 'off',
    indent: 'off',
    '@typescript-eslint/indent': 'off',
  },
};
