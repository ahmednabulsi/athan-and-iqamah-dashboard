import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const MIME = {
  '.json': 'application/json',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
}

function servePublic() {
  return {
    name: 'serve-public',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url  = req.url.split('?')[0]
        const file = path.join(__dirname, '../public', url)
        try {
          if (fs.statSync(file).isFile()) {
            res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream')
            fs.createReadStream(file).pipe(res)
            return
          }
        } catch (_) {}
        next()
      })
    }
  }
}

// Chromium 83 (the un-updatable WebView on cheap Rockchip frames) understands neither
// CSS logical properties nor `:is()`. esbuild lowers `inset-inline-start` but emits the
// physical fallback inside `:is(:lang(...))`, which Chrome 83 discards as an invalid
// selector - so the element loses its offset entirely and collapses onto its neighbour.
// Lightning CSS lowers the same properties without `:is()`, so the fallback survives.
const LEGACY_CSS_TARGETS = { chrome: 83 << 16, safari: 13 << 16 }

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: { targets: LEGACY_CSS_TARGETS },
  },
  // Relative base: produces ./_assets/... URLs in tv.html so the same build works
  // both at https://.../prayer-dash/tv.html and at file:///android_asset/prayer-dash/tv.html.
  base: './',
  plugins: [vue(), servePublic()],
  publicDir: false,
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  build: {
    // Cheap Android frames ship an un-updatable system WebView - the Rockchip MWE-004
    // (Android 11) is on Chromium 83. Vite's default target is chrome87, which leaves
    // logical assignment (`||=`, `&&=`, `??=`, Chrome 85+) in Vue's runtime untranspiled.
    // That is a *parse* error, so the whole bundle dies and the dashboard renders black.
    // Keep this at or below chrome79 unless every deployed display is known to be newer.
    target: ['es2019', 'chrome79', 'safari13'],
    cssMinify: 'lightningcss',
    outDir: '../public/prayer-dash',
    emptyOutDir: false,
    copyPublicDir: false,
    assetsDir: '_assets',
    rollupOptions: {
      input: { tv: './tv.html' }
    }
  },
  server: {
    host: '0.0.0.0', // This makes it accessible on your local network
    port: 5173
  }
})
