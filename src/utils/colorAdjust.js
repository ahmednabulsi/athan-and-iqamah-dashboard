/** @typedef {'text' | 'panel' | 'surface' | 'accent' | 'arabic' | 'onPanel'} NightColorRole */

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  // #RRGGBBAA is a real value here - the Android sidebar writes one when a colour is
  // cleared for a background photo - and parsing all eight digits would shift the
  // channels. Alpha is dropped: callers that care ask isOpaqueColor().
  const trimmed = h.length === 8 ? h.slice(0, 6) : h
  const f = trimmed.length === 3 ? trimmed.split('').map(c => c + c).join('') : trimmed
  const n = parseInt(f, 16)
  return Number.isNaN(n)
    ? { r: 128, g: 128, b: 128 }
    : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const channel = v => Math.max(0, Math.min(255, Math.round(v)))
const toHex = v => channel(v).toString(16).padStart(2, '0')

export function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const lin = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/** weight 0 → colorA, 1 → colorB */
export function mixHex(colorA, colorB, weight = 0.5) {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  const t = Math.max(0, Math.min(1, weight))
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

export function invertHex(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(255 - r, 255 - g, 255 - b)
}

/** Invert hex or rgb/rgba strings; alpha is preserved for rgba. */
export function invertColor(color) {
  const s = String(color || '').trim()
  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  )
  if (rgba) {
    const r = channel(255 - Number(rgba[1]))
    const g = channel(255 - Number(rgba[2]))
    const b = channel(255 - Number(rgba[3]))
    const a = rgba[4] !== undefined ? rgba[4] : 1
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return invertHex(s.startsWith('#') ? s : `#${s}`)
}

export function darken(hex, factor = 0.8) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

export function desaturateHex(hex, amount = 0.35) {
  const { r, g, b } = hexToRgb(hex)
  const gray = 0.299 * r + 0.587 * g + 0.114 * b
  const t = Math.max(0, Math.min(1, amount))
  return rgbToHex(
    r + (gray - r) * t,
    g + (gray - g) * t,
    b + (gray - b) * t,
  )
}

export function toRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const NIGHT_BASE = '#0c1018'
const NIGHT_TEXT = '#d4cfc2'
const NIGHT_TEXT_DIM = '#9a9488'
const NIGHT_SURFACE = '#121a26'

/**
 * Derive a night-mode color from a theme swatch.
 * Uses invert + mix (not raw invert) so custom toolbar palettes stay recognizable.
 */
export function adaptForNight(hex, role = 'text') {
  const source = String(hex || '#888888')
  const inverted = invertHex(source)
  const lum = relativeLuminance(source)

  switch (role) {
    case 'text':
      return lum < 0.4
        ? mixHex(NIGHT_TEXT, inverted, 0.62)
        : mixHex(NIGHT_TEXT_DIM, source, 0.48)

    case 'panel':
      return mixHex(NIGHT_BASE, darken(inverted, 0.22), 0.44)

    case 'surface':
      return mixHex(NIGHT_SURFACE, darken(source, 0.28), 0.4)

    case 'accent':
      return desaturateHex(mixHex(inverted, source, 0.28), 0.42)

    case 'arabic':
      return desaturateHex(
        mixHex('#556070', darken(mixHex(NIGHT_BASE, inverted, 0.35), 0.55), 0.5),
        0.38,
      )

    case 'onPanel':
      return lum < 0.55
        ? mixHex(NIGHT_TEXT, inverted, 0.55)
        : mixHex(NIGHT_TEXT, source, 0.35)

    default:
      return source
  }
}

export function resolveThemedColor(hex, role, darkMode) {
  return darkMode ? adaptForNight(hex, role) : String(hex || '#888888')
}

/** Resolve hex or rgb/rgba swatches; rgba alpha is preserved. */
export function resolveThemedAny(color, role, darkMode) {
  const s = String(color || '').trim()
  const rgba = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  )
  if (rgba) {
    const hex = rgbToHex(Number(rgba[1]), Number(rgba[2]), Number(rgba[3]))
    const resolved = resolveThemedColor(hex, role, darkMode)
    const { r, g, b } = hexToRgb(resolved)
    const a = rgba[4] !== undefined ? rgba[4] : 1
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return resolveThemedColor(s, role, darkMode)
}
/** WCAG contrast ratio between two colours. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * A version of `color` that is actually readable on `ground`.
 *
 * A mosque's accent is chosen to look right as a fill or a rule; used as label
 * text it can land far too close to the ground — the ivory layout's gold sits at
 * 2.3:1, which reads as grey mush on a wall display. Mix it toward the layout's
 * own ink until it clears `min` (3:1, the large-text threshold), and leave it
 * alone when it already does.
 */
export function readableOn(color, ground, ink, min = 3.2) {
  if (!/^#/.test(String(color)) || !/^#/.test(String(ground))) return color
  if (contrastRatio(color, ground) >= min) return color
  const target = /^#/.test(String(ink)) ? ink : '#000000'
  let out = color
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    out = mixHex(color, target, t)
    if (contrastRatio(out, ground) >= min) return out
  }
  return out
}

/**
 * True when [value] is a hex colour that actually covers what is behind it.
 *
 * A layout whose background is cleared for a photo arrives as `#00000000` - a valid
 * hex, fully transparent. Screens that borrow the layout's ground have to tell that
 * apart from a real colour, or they paint nothing and render over the board. Anything
 * that is not a hex (a gradient, 'transparent', '') is not an opaque colour either.
 */
export function isOpaqueColor(value) {
  const h = String(value || '').trim()
  if (!/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) return false
  const body = h.slice(1)
  if (body.length === 6 || body.length === 3) return true
  const alpha = body.length === 8 ? parseInt(body.slice(6), 16) : parseInt(body[3] + body[3], 16)
  return alpha >= 0xF0
}
