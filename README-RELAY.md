# Relay

## GitHub Pages

Upload this whole project, including `.github/workflows/pages.yml`, to your repository. In Settings → Pages, choose **GitHub Actions** as the build and deployment source. Push to `main`, or run **Publish Relay to GitHub Pages** manually in the Actions tab. If your default branch is different, change the workflow's branch filter.

The workflow tests and builds the browser-only React entry point with `npm run build:pages`, then deploys `dist-pages`. Relative asset URLs support both repository subpaths and custom domains. No API-key repository secret is needed: each visitor enters their own key in the app. For local development of this target, use `npm run dev:pages`.

React JavaScript chat interface for OpenRouter. Product code: `app/page.jsx`. Streaming transport: `lib/openrouter.mjs`. The hosting scaffold uses Vinext/Vite and TypeScript configuration.

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. Production build: `npm run build`.

Open connection settings and paste an OpenRouter API key. Choose a text model and press Enter to send; Shift+Enter inserts a newline. Stop cancels the browser request; billing cancellation depends on the provider.

The model catalog loads live. Inference goes directly from the browser to OpenRouter. API keys stay in memory and clear on reload. Chats save in localStorage on this browser only. Export downloads chat JSON without keys. No cross-device sync, agents, attachments, or local model support. Model output is rendered as text and fenced code, never executable HTML.

No live paid inference was performed during development. Transport tests: `node --test tests/openrouter.test.mjs`.
