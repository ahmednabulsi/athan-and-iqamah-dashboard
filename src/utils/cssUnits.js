/**
 * Container-query length units (`cqi`, `cqb`) are Chrome 105+.
 *
 * The cheap Rockchip photo frames this dashboard runs on ship an un-updatable
 * Chromium 83. There, `clamp(59px, 9.1cqi, 85px)` is an invalid value - and because
 * these sizes reach CSS through a custom property (Vue's `v-bind` compiles to
 * `width: var(--x)`), an invalid value is *invalid at computed-value time*: the
 * property resets to its initial value rather than falling back to an earlier
 * declaration. `width` became `auto`, so mosque logos rendered at full intrinsic
 * size - several times too large - on Heritage Panel, Portrait Board, Spotlight
 * Cards and Calligraphy Gallery.
 *
 * A two-declaration CSS fallback cannot fix that, so pick the unit up front.
 * Where no ancestor declares `container-type`, `cqi` already resolves against the
 * viewport, making `vw` exactly equivalent; where one does (Layout 5's rotated
 * panel) container queries are unsupported on that browser anyway, so the viewport
 * is the only sensible basis.
 */
export const supportsContainerUnits =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('width', '1cqi')

/** `cqi` on browsers that have container queries, `vw` everywhere else. */
export const CQI = supportsContainerUnits ? 'cqi' : 'vw'

/** Builds a `clamp()` whose middle term uses the supported inline-size unit. */
export const clampCqi = (min, scale, max) => `clamp(${min}, ${scale}${CQI}, ${max})`

/**
 * Container-query units mapped onto their viewport equivalents.
 * `cqi`/`cqw` are inline-size percentages, `cqb`/`cqh` block-size.
 */
const CQ_TO_VIEWPORT = {
  cqi: 'vw', cqw: 'vw', cqb: 'vh', cqh: 'vh', cqmin: 'vmin', cqmax: 'vmax',
}

/**
 * The same mapping for the two layouts whose panel is rotated a quarter turn and
 * sized `100vh x 100vw` (Portrait Board, Prayer Frame). There the container's inline
 * size IS the viewport's height, so the axes swap: rewriting `cqi` to `vw` sized a
 * logo off the screen's long edge and made it ~50% too big on a landscape frame.
 */
const CQ_TO_VIEWPORT_ROTATED = {
  cqi: 'vh', cqw: 'vh', cqb: 'vw', cqh: 'vw', cqmin: 'vmin', cqmax: 'vmax',
}

/**
 * Rewrites container-query units in a CSS value when the browser has none.
 *
 * Needed because these values do not only come from the defaults above: the
 * Android app sends every layout's control values on the dashboard URL, sourced
 * from `tv-settings.json` (and from whatever an admin has saved), so a `cqi`
 * value arrives even when this module's own default would have avoided it.
 * Returns the value untouched on any browser that supports container units.
 */
export function withSupportedUnits(value, { rotated = false } = {}) {
  if (!value || supportsContainerUnits) return value
  const map = rotated ? CQ_TO_VIEWPORT_ROTATED : CQ_TO_VIEWPORT
  return String(value).replace(
    /(\d*\.?\d+)(cqi|cqw|cqb|cqh|cqmin|cqmax)\b/gi,
    (_m, n, unit) => n + map[unit.toLowerCase()]
  )
}
