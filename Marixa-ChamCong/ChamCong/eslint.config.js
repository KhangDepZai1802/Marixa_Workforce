import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // LanguageProvider.jsx vừa export component (LanguageProvider) vừa export
          // các helper i18n (getLanguage / translate / localeForLanguage / useLanguage).
          // Whitelist giúp Fast Refresh không cảnh báo; không tách file để tránh
          // circular-import (phrases dict + LanguageContext là module-private).
          allowExportNames: [
            'getLanguage',
            'translate',
            'localeForLanguage',
            'useLanguage',
          ],
        },
      ],
    },
  },
]
