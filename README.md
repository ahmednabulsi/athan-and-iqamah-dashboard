# athan-and-iqamah-dashboard

The prayer-times dashboard behind [Athan & Iqamah](https://getathan.com) — a full-screen
board for a TV or wall-mounted display in a masjid, showing adhan and iqamah times, a
countdown to the next prayer, Jumu'ah sessions, and events.

It is a Vue 3 single-page app built with Vite. A display loads it in a browser or a
WebView and configures itself entirely from URL parameters, so one build serves every
mosque and every layout.

## Running it

```bash
npm install
npm run dev
```

Then open a URL with at least a mosque and a layout. This one works as-is:

```
http://localhost:5173/tv.html?mosque=https%3A%2F%2Fgetathan.com%2Fapi%2Fprayers.php%3Fid%3DE5Av2wAX&name=Masjid%20Al-Noor&bg=layout-9
```

`mosque` is a URL-encoded prayer-times endpoint; `name` is the label shown on the board.
Any mosque id from `https://getathan.com/api/mosques.php` works in place of `E5Av2wAX`.

### Layouts

Swap `bg=` to try each one:

| `bg=` | Layout |
|---|---|
| `layout-1` | Heritage Panel |
| `layout-3` | Classic Ivory |
| `layout-4` | Modern Tiles |
| `layout-5` | Portrait Board |
| `layout-7` | Spotlight Cards |
| `layout-8` | Photo Sidebar |
| `layout-9` | Wide Schedule |
| `layout-10` | Calligraphy Gallery |
| `layout-11` | Prayer Frame |

### Useful parameters

| Parameter | Values | Effect |
|---|---|---|
| `time_format` | `12`, `24` | Clock format |
| `lang` | `en`, `ar` | Board language; `ar` switches to the Arabic layout |
| `dark_mode` | `auto`, `on`, `off` | Night mode |
| `hijri_offset` | `-2`…`2` | Shifts the Hijri date by days |
| `show_seconds`, `show_hijri`, `show_sunrise`, `show_mosque` | `true`, `false` | Show or hide each element |
| `prayer_alerts` | `true`, `false` | Whether the adhan plays at all |
| `<prayer>_trigger` | `off`, `azaan`, `iqamah` | When each prayer sounds (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) |
| `<prayer>_offset` | minutes | Minutes *before* iqamah, when the trigger is `iqamah` |
| `<prayer>_azaan_offset` | minutes | Minutes *after* the adhan, when the trigger is `azaan` |
| `quiet_hours`, `quiet_from`, `quiet_to` | `true`/`false`, `HH:MM` | Never play the adhan inside this window; wraps midnight |
| `debug` | `1` | Shows the debug toolbar, including a settable clock |

Each layout also takes its own colour and size parameters, prefixed by layout
(`l4_accent`, `l9_tile_color`, `l11_adhan_scale`, and so on). The full set and the
layouts' theme presets live in `tv-settings.json`, which the board fetches at runtime.

`debug=1` is the quickest way to test prayer transitions — it lets you move the clock
rather than waiting for a real adhan.

## Two things to expect in local development

**Themes and image backgrounds will be empty.** The board fetches `tv-settings.json`
from `tv.getathan.com`, which sends no CORS header for `localhost`, so the request fails
and the app falls back to its built-in defaults. Layouts still render; only the
server-driven lists (themes, image backgrounds, adhan list) are missing. In production
the file is same-origin, so this never happens there. Run a local proxy, or drop a copy
of the file alongside the app, if you need them.

**A font 404s.** `vite.config.js` serves static files from a sibling `public/` directory
that belongs to the larger project this is extracted from, so the Roboto file is not
here and the browser substitutes a fallback. The same assumption means `npm run build`
writes to `../public/prayer-dash`, *outside* this repository.

## A note on the build target

The build targets `chrome79`, which is lower than Vite's default. Cheap Android photo
frames ship an un-updatable system WebView — the Rockchip panels this runs on are on
Chromium 83 — and anything newer leaves syntax in Vue's runtime that those engines
cannot parse. That is a parse error, so the whole bundle dies and the board renders
black. CSS is lowered with Lightning CSS for the same reason. Read the comments in
`vite.config.js` before raising either.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. You are welcome
to explore, modify, and contribute to this project for noncommercial purposes. Commercial
use, including incorporating the software into paid products or commercial services, is
not permitted without prior written permission from the copyright holder.

See [LICENSE](LICENSE) for the full text.
