module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'script',
    ecmaVersion: 2018,
    "resolveJsonModule": true,
  },
  extends: [
    'standard',
    'eslint:recommended',
    'google',
    'prettier',
    'prettier/standard',
  ],
  plugins: [
    'prettier',
  ],
  rules: {
    'max-len': ['warn', { 
      code: 80, 
      ignoreUrls: true, 
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    // Only allow debugger in development
    'no-debugger': process.env.PRE_COMMIT ? 'error' : 'off',
    // Only allow `console.log` in development
    'no-console': process.env.PRE_COMMIT
      ? ['error', { allow: ['warn', 'error'] }]
      : 'off',
    'vars-on-top': 'error',
    'sort-vars': 'error',
    'eol-last': ['error', 'always'],
    'prefer-const': 'error',
    'no-trailing-spaces': 'error',
    'max-statements-per-line': ['error', {
      'max': 1
    }],
    'newline-per-chained-call': ['error', {
      'ignoreChainWithDepth': 2
    }],
    'sort-imports': ['error', {
      'ignoreCase': false,
      'ignoreDeclarationSort': true,
      'ignoreMemberSort': false,
      'memberSyntaxSortOrder': ['none', 'all', 'multiple', 'single']
    }],
    'no-duplicate-imports': ['error', {
      'includeExports': true,
    }],
    'object-curly-newline': ['error', {
      'ObjectExpression': { 'minProperties': 1 },
      'ObjectPattern': { 'minProperties': 1 },
      'ImportDeclaration': { 'minProperties': 2 },
      'ExportDeclaration': { 'minProperties': 2 },
    }],
    'object-property-newline': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'indent': ['error', 2],
    // 'sort-keys': 'error', <- conflict with vue/attributes-order
  },
  env: {
    es6: true,
  },
}
