export default [
    {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        sourceType: 'module',
    },
        plugins: ['@typescript-eslint', 'import', 'simple-import-sort', 'prettier'],
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
    ignorePatterns: ['eslint.config.js', 'dist/'],
    rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/lines-between-class-members': 'off',
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
    overrides: [
        {
            files: ['*.ts'],
            rules: {
                complexity: ['warn', { max: 10 }],
            },
        },
        {
            files: ['*.ts'],
            rules: {
                complexity: ['error', { max: 15 }],
            },
        },
    ],
    },
];
