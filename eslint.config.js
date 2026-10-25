import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Serverless functions and build scripts run in Node, not the browser.
    // Without this every `process` and `Buffer` reads as an undefined global
    // and buries the findings that actually matter.
    // src/lib/watermark.js runs only on the server: it is imported by api
    // routes and never reachable from the browser bundle, so it needs node
    // globals like Buffer rather than the browser set above.
    files: ['api/**/*.js', 'scripts/**/*.js', 'src/lib/watermark.js'],
    languageOptions: { globals: globals.node },
  },
])
