/**
 * The focus screen's state machine, shared by every layout that has one.
 *
 * The screen itself is FocusScreen.vue; this is the time maths behind it — which
 * prayer it is pinned to, whether that prayer's adhan has been called, what the
 * countdown pill is counting to, and whether the board has to hold on the screen
 * instead of alternating back to its cards.
 *
 * It was built on Classic Ivory (layout-3) and is now the one copy for all of them.
 * The Prayer Frame (layout-11) keeps its own screen and does not use this.
 *
 * Inputs are getters (refs, computeds or plain functions) so a layout can hand over
 * its own props without the composable holding a reference to the component.
 */
import { computed, toValue } from 'vue'
import { getPrayerDateTime, getNextPrayerDateTime } from './prayerTime.js'
import { nextJumuahAt } from './jumuah.js'

/** Feed keys per prayer, with the two flags getPrayerDateTime needs to disambiguate. */
export const FOCUS_PRAYERS = [
  { key: 'fajr',    azaanKey: 'fajr_azaan',    iqamahKey: 'fajr_iqamah',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   azaanKey: 'dhuhr_azaan',   iqamahKey: 'dhuhr_iqamah',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     azaanKey: 'asr_azaan',     iqamahKey: 'asr_iqamah',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', azaanKey: 'maghrib_azaan', iqamahKey: 'maghrib_iqamah', isFajr: false, isDhuhr: false },
  { key: 'isha',    azaanKey: 'isha_azaan',    iqamahKey: 'isha_iqamah',    isFajr: false, isDhuhr: false },
]

const pad2 = n => String(n).padStart(2, '0')

/** Always three fields: the sidebar countdown's width is sized for them. */
export function formatHMS(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t / 60) % 60))}:${pad2(t % 60)}`
}

/** Hours only once there are any: "03:43:59" far out, "19:00" on the home stretch. */
export function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const rest = `${pad2(Math.floor((t / 60) % 60))}:${pad2(t % 60)}`
  return h > 0 ? `${pad2(h)}:${rest}` : rest
}

/**
 * @param src getters:
 *   now                     Date — the board's clock (debugNow(), so time travel works)
 *   prayerData              the active day's feed slice
 *   todayPrayerData         today's slice, even once the board has rolled to tomorrow
 *   nextPrayerKey           the board's next prayer
 *   jumuahPrayers           Friday's sessions ([] otherwise)
 *   nightFocusAfterIshaMin  minutes after Isha iqamah, or 'off'
 *   countdownFor            'athan' | 'iqamah' | 'both'
 *   darkMode                the board's night window is open
 *   baseDate                optional — the day the feed slice belongs to
 *   focusIsJumuah           optional — the focused row is a Jumu'ah session
 */
export function useFocusScreen(src) {
  const get = name => toValue(src[name])

  /** A prayer's adhan and iqamah as datetimes.
   *
   *  The iqamah is resolved first because it is always ahead of now (rolling to
   *  tomorrow on its own); the adhan is then read on *that* calendar day, so between
   *  the two it stays behind us instead of rolling forward and reading as "still to
   *  come". Deriving the adhan with getNextPrayerDateTime would skip the called state
   *  entirely. Shared by the sidebar countdown and the focus pill. */
  function prayerWindow(key) {
    const p = FOCUS_PRAYERS.find(x => x.key === key)
    const data = get('prayerData')
    if (!p || !data) return null
    const now = get('now')
    const iqamahAt = getNextPrayerDateTime(data[p.iqamahKey], p.isFajr, p.isDhuhr, now)
    const adhanAt  = getPrayerDateTime(data[p.azaanKey], p.isFajr, p.isDhuhr, iqamahAt)
    return { adhanAt, iqamahAt }
  }

  // ── Night focus ───────────────────────────────────────────────────────────
  // From Isha iqamah + N minutes until the Fajr adhan the cards step aside entirely
  // and the focus screen holds, pinned to Fajr. Anchored to Isha rather than to the
  // app's dark-mode window, which opens at Maghrib iqamah by default and would bury
  // Isha for the whole evening.
  const nightFocusActive = computed(() => {
    const setting = String(get('nightFocusAfterIshaMin') ?? '20')
    const data = get('prayerData')
    if (setting === 'off' || !data) return false
    const minutes = Number(setting)
    if (!Number.isFinite(minutes)) return false

    const now = get('now')
    const today = get('todayPrayerData') || data
    const base = new Date(now)
    const ishaIqamah = today?.isha_iqamah
      ? getPrayerDateTime(today.isha_iqamah, false, false, base) : null
    const fajrAdhan = data?.fajr_azaan
      ? getPrayerDateTime(data.fajr_azaan, true, false, base) : null
    if (!ishaIqamah || !fajrAdhan) return false

    const start = new Date(ishaIqamah.getTime() + minutes * 60000)
    return now >= start || now < fajrAdhan          // overnight window
  })

  /** Fajr all night; otherwise whatever is next. */
  const focusKey = computed(() => (nightFocusActive.value ? 'fajr' : get('nextPrayerKey')))

  // ── Two-stage countdown ───────────────────────────────────────────────────
  // State 1 counts down to the focused prayer's adhan; the moment the adhan time
  // arrives the same pill switches to its iqamah and the board marks the adhan
  // CALLED. State 3 — the iqamah passing — needs nothing here: nextPrayerKey only
  // moves off a prayer once its *iqamah* is behind us, so the next prayer arrives
  // already in state 1.
  const focusWindow = computed(() => prayerWindow(focusKey.value))
  const focusIsJumuah = computed(() => !!get('focusIsJumuah'))
  const focusIqamahAt = computed(() =>
    focusIsJumuah.value
      ? nextJumuahAt(get('jumuahPrayers'), get('now'))
      : focusWindow.value?.iqamahAt || null
  )
  const focusAdhanAt = computed(() => focusWindow.value?.adhanAt || null)

  /** Fact, not preference: this prayer's adhan time is behind us. Drives the CALLED
   *  badge and the dimmed adhan column whatever the countdown is set to. */
  const adhanPassed = computed(() => {
    const adhan = focusAdhanAt.value
    if (!adhan || focusIsJumuah.value) return false
    return get('now') >= adhan
  })

  /** What the pill counts to, which the Countdown For setting governs:
   *   • Iqamah only      — always the iqamah, before the adhan as well.
   *   • Athan and Iqamah — the adhan, then the iqamah once it is called.
   *   • Athan only       — the adhan; after it is called the pill switches to the
   *     iqamah *only* while night mode is on (the board is already holding on the
   *     focus screen then). By day it goes quiet and the board resumes its normal
   *     alternation, which is what "athan only" asks for.
   *  null = no countdown to show. */
  const pillTarget = computed(() => {
    if (focusIsJumuah.value) return 'khutbah'
    const setting = String(get('countdownFor') || 'athan')
    if (setting === 'iqamah') return 'iqamah'
    if (!adhanPassed.value) return 'adhan'
    if (setting === 'both' || get('darkMode')) return 'iqamah'
    return null
  })

  const countdown = computed(() => {
    const kind = pillTarget.value
    if (!kind) return ''
    const target = kind === 'adhan' ? focusAdhanAt.value : focusIqamahAt.value
    if (!target) return ''
    return formatCountdown(target - get('now'))
  })

  /** From the adhan to the iqamah the focus screen holds instead of alternating back
   *  to the cards: the countdown it has just switched to is the one the hall is
   *  waiting on. Only while the pill is actually counting to that iqamah — with
   *  "athan only" by day the board goes back to alternating. */
  const awaitingIqamah = computed(() => adhanPassed.value && pillTarget.value === 'iqamah')

  /** The main view's own countdown. It names its target and switches with it: the
   *  adhan until it is called, then the iqamah. Unlike the pill this ignores
   *  Countdown For — a board's sidebar is a permanent fixture and must never blank.
   *  `target` is 'adhan' | 'iqamah' | 'khutbah'; the layout supplies the wording. */
  const sidebar = computed(() => {
    const blank = { target: 'iqamah', text: '--:--:--' }
    const key = get('nextPrayerKey')
    if (!get('prayerData') || !key) return blank
    const now = get('now')
    // A Jumu'ah session counts down to its khutbah; Dhuhr's iqamah may be long past.
    const khutbah = key === 'dhuhr' ? nextJumuahAt(get('jumuahPrayers'), now) : null
    if (khutbah) return { target: 'khutbah', text: formatHMS(khutbah - now) }
    const w = prayerWindow(key)
    if (!w) return blank
    const toAdhan = now < w.adhanAt
    return {
      target: toAdhan ? 'adhan' : 'iqamah',
      text:   formatHMS((toAdhan ? w.adhanAt : w.iqamahAt) - now),
    }
  })

  /** Time left to THIS prayer's iqamah — what the adhan takeover counts down.
   *  Clamped at zero rather than rolling to tomorrow, so a passed iqamah reads
   *  00:00:00 instead of 23:59:5x. */
  const iqamahCountdown = computed(() => {
    const p = FOCUS_PRAYERS.find(x => x.key === get('nextPrayerKey'))
    const data = get('prayerData')
    if (!p || !data) return '--:--:--'
    const target = getPrayerDateTime(data[p.iqamahKey], p.isFajr, p.isDhuhr, get('baseDate') || get('now'))
    return formatHMS(target - get('now'))
  })

  return {
    prayerWindow,
    nightFocusActive,
    focusKey,
    adhanPassed,
    pillTarget,
    countdown,
    awaitingIqamah,
    sidebar,
    iqamahCountdown,
  }
}
