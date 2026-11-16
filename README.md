# athan-and-iqamah-dashboard

The prayer-times dashboard behind [Athan & Iqamah](https://getathan.com) — a full-screen
board for a TV or wall-mounted display in a masjid, showing adhan and iqamah times, a
countdown to the next prayer, Jumu'ah sessions, and events.

It is a Vue 3 single-page app built with Vite. A display loads it in a browser or a
WebView and configures it entirely through URL parameters, so one build serves every
mosque and every layout.

## Layouts

Eleven layouts ship, each with its own colour, size and background controls: Heritage
Panel, Split Dashboard, Classic Ivory, Modern Tiles, Portrait Board, Spotlight Cards,
Photo Sidebar, Wide Schedule, Calligraphy Gallery and Prayer Frame, plus a dedicated
Arabic layout. Any of them can be themed from a set of palettes or tuned colour by
colour.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173/tv.html
npm run build
```

Open with parameters, for example:

```
tv.html?mosque=<id>&bg=layout-9&time_format=12
```

## A note on the build target

The build targets `chrome79`, which is lower than Vite's default. Cheap Android photo
frames ship an un-updatable system WebView — the Rockchip panels this runs on are on
Chromium 83 — and anything newer leaves syntax in Vue's runtime that those engines
cannot parse, which kills the whole bundle and renders a black screen. CSS is lowered
with Lightning CSS for the same reason. See the comments in `vite.config.js` before
raising either.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. You are welcome
to explore, modify, and contribute to this project for noncommercial purposes. Commercial
use, including incorporating the software into paid products or commercial services, is
not permitted without prior written permission from the copyright holder.

See [LICENSE](LICENSE) for the full text.
