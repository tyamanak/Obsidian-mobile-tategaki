# Mobile Vertical Reader

Mobile Vertical Reader is an Obsidian plugin for reading Markdown notes in a vertical writing view on mobile.

## Features

- Opens the current Markdown note in a custom reader view.
- Uses `MarkdownRenderer.render()` so Obsidian-flavored Markdown, internal links, and embeds stay close to native rendering.
- Displays content with `writing-mode: vertical-rl`.
- Supports tap and swipe page navigation.
- Stores reading progress per file.
- Refreshes on source file modify, rename, and delete events.
- Supports built-in CSS-variable themes plus inline or vault-file custom CSS.

## Development

```bash
npm install
npm run typecheck
npm run build
```

The production build writes `main.js`. Obsidian loads `main.js`, `manifest.json`, and `styles.css` from the plugin directory.

## Runtime Constraints

The plugin runtime uses Obsidian Plugin API and browser DOM APIs only. Node.js and Electron APIs are not used in `src/`.
