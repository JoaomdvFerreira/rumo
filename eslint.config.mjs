import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'node_modules/**', 'playwright-report/**']),
  {
    files: ['src/domain/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'next/*', 'src/app/*', 'src/server/*'],
              message: 'Domain code must remain framework and application-layer independent.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/content/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'next/*', 'src/app/*', 'src/server/*'],
              message: 'Canonical content must not import UI or application layers.',
            },
          ],
        },
      ],
    },
  },
]);
