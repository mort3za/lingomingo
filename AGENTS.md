# AGENTS.md

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend (Chrome extension)

This project is a Chrome extension (Manifest V3). The build uses **Vite + `@crxjs/vite-plugin`**, not `Bun.serve()` HTML imports. Bun is the package manager and script runner.

- UI: Vue 3 (`<script setup lang="ts">`), vue-router (hash history), Tailwind CSS v4.
- Manifest: `manifest.config.ts`. Pages not in the manifest must be added to `build.rolldownOptions.input` in `vite.config.ts`.
- Entry points:
  - `src/background/` — service worker (toolbar click opens the app page, context menu "Read in Lingomingo").
  - `src/content/` — Netflix / YouTube content scripts. Mount Vue in a shadow root with `mountInShadow()`.
  - `src/sidepanel/` — `chrome.sidePanel` page.
  - `src/app/` — main extension page with all app pages (media, reader, saved items, settings, ...). No popup.
  - `src/shared/` — code and styles used by more than one entry point.
- TypeScript is pinned to 6.0.x: `vue-tsc` and `typescript-eslint` do not support the TS 7 native compiler yet.
- Reference docs for features: `docs/origin/` (Language Reactor, the product we clone).

## Claude API key for testing AI mode

The file `TOKEN_CLAUDE` in the repo root has a Claude API key. Use it to test AI mode (AI subtitle translation and the word popup).
Also `TOKEN_DEEPSEEK` for Deepseek API key.

- The file is in `.gitignore`. Never commit it.
- Do not open it with a file reader. Do not print it, log it, or put it in screenshots, docs, or commit messages.
- Use it only through shell substitution, for example `"$(cat CLAUDE_TOKEN)"`.

## Testing the extension in a browser

Branded Chrome ignores `--load-extension`. Use Chrome for Testing:

1. Download it into a temp folder (not the repo): `bunx @puppeteer/browsers install chrome@stable --path <temp>/cft`
2. Build: `bun run build`
3. Start it with the extension:

   ```sh
   agent-browser --session lm --headed \
     --executable-path "<path to Google Chrome for Testing binary>" \
     --extension "$PWD/dist" \
     --args "--disable-blink-features=AutomationControlled" \
     open "https://www.youtube.com/watch?v=jNQXAC9IVRw"
   ```

   Without `--disable-blink-features=AutomationControlled`, YouTube returns empty captions.

4. Get the extension ID on `chrome://extensions` with `chrome.management.getAll`. The app page is `chrome-extension://<id>/src/app/index.html#/settings`.
5. To set the API key, run this on the app page (the key is not shown in the output):

   ```sh
   agent-browser --session lm eval "chrome.storage.local.get('settings').then(({settings}) => chrome.storage.local.set({settings: {...settings, provider: 'claude', claudeKey: '$(tr -d '[:space:]' < CLAUDE_TOKEN)'}})).then(() => 'ok')"
   ```

6. To force AI subtitle translation, set the translation language (`nativeLang`) to a language with no human-made track on the video, for example `fa`.
7. Close the browser when you are done: `agent-browser --session lm close`
