/**
 * Shared "next prayer event" maths for the countdown / athan interrupt screens.
 *
 * Three places render those screens — the Prayer Frame (layout-11) and the Classic
 * Ivory layout (layout-3) have designed-in versions, and PrayerInterrupt.vue covers
 * every other layout. They are all driven by the same Countdown For / Countdown Lead
 * settings, so the rules for "which event is next" live here rather than in each.
 */

export const PRAYER_ORDER = [
  { key: 'fajr',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    isFajr: false, isDhuhr: false },
]

/** Feed suffixes the countdown watches: 'athan' | 'iqamah' | 'both'. */
export function countdownKinds(setting) {
  const v = String(setting || 'athan')
  if (v === 'both')   return ['azaan', 'iqamah']
  if (v === 'iqamah') return ['iqamah']
  return ['azaan']
}

/** Lead time in ms. 'off' (or anything unparseable as > 0) disables the screen. */
export function countdownLeadMs(setting) {
  const raw = String(setting ?? '1')
  if (raw === 'off') return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n * 60_000 : 0
}

/**
 * The next countdown-eligible event, or null.
 *
 * @param resolve (key, kind) => Date|null — supplied by the caller because each
 *        layout resolves feed times against its own base date.
 * @returns { key, kind, at } with `at` rolled to tomorrow when the day is done.
 */
export function findNextEvent(resolve, kinds, now) {
  let best = null
  for (const { key } of PRAYER_ORDER) {
    for (const kind of kinds) {
      const t = resolve(key, kind)
      if (t && t > now && (!best || t < best.at)) best = { key, kind, at: t }
    }
  }
  if (best) return best

  // Everything today has passed: roll over to tomorrow's earliest eligible event.
  const first = kinds
    .map(kind => {
      const t = resolve('fajr', kind)
      return t ? { key: 'fajr', kind, at: t } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at)[0]
  if (!first) return null
  const at = new Date(first.at)
  at.setDate(at.getDate() + 1)
  return { ...first, at }
}

/** Bare seconds inside the last minute, m:ss above it — "287" reads as nothing. */
export function countdownText(totalSeconds) {
  const t = Math.max(0, totalSeconds)
  if (t < 60) return String(t)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
