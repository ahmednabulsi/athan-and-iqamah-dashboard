import { getPrayerDateTime } from './prayerTime.js'

export const DARK_START_ANCHORS = {
  maghrib_iqamah: { field: 'maghrib_iqamah', isFajr: false, isDhuhr: false },
  maghrib_azaan:  { field: 'maghrib_azaan',  isFajr: false, isDhuhr: false },
  isha_iqamah:    { field: 'isha_iqamah',    isFajr: false, isDhuhr: false },
  isha_azaan:     { field: 'isha_azaan',     isFajr: false, isDhuhr: false },
  sunset:         { field: 'maghrib_azaan',  isFajr: false, isDhuhr: false },
}

export const DARK_END_ANCHORS = {
  fajr_azaan:  { field: 'fajr_azaan',  isFajr: true,  isDhuhr: false },
  fajr_iqamah: { field: 'fajr_iqamah', isFajr: true,  isDhuhr: false },
  // The board stays dark through Fajr and only comes back to the light palette at
  // sunrise. A handful of feeds carry no sunrise row, so this falls back to Fajr
  // adhan rather than leaving the night window unresolvable (= no dark mode at all).
  sunrise:     { field: 'sunrise',     isFajr: true,  isDhuhr: false, fallbackField: 'fajr_azaan' },
}

const DEFAULT_START = 'maghrib_iqamah'
const DEFAULT_END = 'sunrise'

export function parseDarkBrightness(value, fallback = 0.55) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0.3, Math.min(1, n))
}

export function resolveAnchorTime(prayerData, anchorKey, anchors, baseDate = new Date()) {
  if (!prayerData) return null
  const key = anchors[anchorKey] ? anchorKey : Object.keys(anchors)[0]
  const anchor = anchors[key]
  const raw = prayerData[anchor.field] || (anchor.fallbackField ? prayerData[anchor.fallbackField] : null)
  if (!raw) return null
  return getPrayerDateTime(raw, anchor.isFajr, anchor.isDhuhr, baseDate)
}

export function applyMinuteOffset(date, minutes) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + Number(minutes || 0))
  return d
}

/** Overnight window: start is PM anchor, end is AM anchor. */
export function isInNightWindow(now, start, end) {
  if (!start || !end) return false
  return now >= start || now < end
}

export function computeDarkMode({
  mode = 'auto',
  prayerData = null,
  startKey = DEFAULT_START,
  endKey = DEFAULT_END,
  startOffset = 0,
  endOffset = 0,
  now = new Date(),
  baseDate = new Date(),
} = {}) {
  if (mode === 'on') return true
  if (mode === 'off') return false

  const startRaw = resolveAnchorTime(prayerData, startKey, DARK_START_ANCHORS, baseDate)
  const endRaw = resolveAnchorTime(prayerData, endKey, DARK_END_ANCHORS, baseDate)
  if (!startRaw || !endRaw) return false

  const start = applyMinuteOffset(startRaw, startOffset)
  const end = applyMinuteOffset(endRaw, endOffset)
  return isInNightWindow(now, start, end)
}