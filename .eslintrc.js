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
        'plugin:prettier/recommended',
        'airbnb-typescript/base',
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: ['.eslintrc.js', 'dist/'],
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
        'prettier/prettier': [
            'error',
            {
                endOfLine: 'lf',
            },
        ],
        indent: 'off',
        '@typescript-eslint/indent': 'off',
    },
};