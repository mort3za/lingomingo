# Lingomingo

A Chrome extension (Manifest V3) to learn languages with Netflix, YouTube, and any web page.
It is a simplified clone of Language Reactor. See [docs/origin/](docs/origin/README.md).

Stack: Bun, Vite + CRXJS, Vue 3, TypeScript, Tailwind CSS v4.

## Setup

```bash
bun install
```

## Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `bun run dev`          | Dev build in `dist/` with HMR (keep it running) |
| `bun run build`        | Production build in `dist/`                     |
| `bun run typecheck`    | Type check with `vue-tsc`                       |
| `bun run lint`         | ESLint                                          |
| `bun run format`       | Prettier (write)                                |
| `bun run format:check` | Prettier (check only)                           |
| `bun run test`         | `bun test`                                      |

## Load the extension in Chrome

1. Run `bun run dev` (or `bun run build`).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.

## Structure

```
manifest.config.ts   Extension manifest (CRXJS)
vite.config.ts       Build config
src/
  background/        Service worker: toolbar click opens app page, context menu
  content/           Netflix / YouTube content scripts (Vue in shadow DOM)
  sidepanel/         Chrome side panel page
  app/               Main extension page: media, reader, saved items, settings, ...
  shared/            Shared code and styles (Tailwind theme)
```

## License

Code: [GNU GPL v3](LICENSE) or later.

Word lists in `public/freq/` have their own licenses: frequency lists (`<lang>.txt`) are CC BY-SA 4.0, lemma lists (`<lang>-lemmas.txt`) are ODbL 1.0. See [public/freq/CREDITS.txt](public/freq/CREDITS.txt). To make them again: `bun scripts/freq-lists.ts`.
