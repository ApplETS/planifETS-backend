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
    'prettier', // Disables formatting rules that conflict with Prettier
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
    // Disable formatting rules (handled by Prettier)
    'block-spacing': 'off',
    '@typescript-eslint/brace-style': 'off',
    indent: 'off',
    '@typescript-eslint/indent': 'off',
    // Disable deprecated formatting rules that were removed in v8
    '@typescript-eslint/comma-dangle': 'off',
    '@typescript-eslint/comma-spacing': 'off',
    '@typescript-eslint/func-call-spacing': 'off',
    '@typescript-eslint/keyword-spacing': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/space-before-blocks': 'off',
    '@typescript-eslint/quotes': 'off',
    '@typescript-eslint/semi': 'off',
    '@typescript-eslint/space-before-function-paren': 'off',
    '@typescript-eslint/space-infix-ops': 'off',
    '@typescript-eslint/object-curly-spacing': 'off',
  },
};
