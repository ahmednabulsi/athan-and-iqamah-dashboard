<template>
  <div
    class="l9-root"
    :dir="dir"
    :class="{ 'is-dark': darkMode }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >

    <!-- ── Background ── -->
    <div class="l9-bg">
      <div v-if="bgImage" class="l9-image night-dim" :style="bgImageStyle"></div>
      <div v-else class="l9-plain-bg"></div>
      <div class="l9-overlay"></div>
      <!-- Main view sits on the same dark ground as the focus view: the two screens
           alternate every 30s and previously flipped between a light and a dark
           design. Any mosque background image still reads through the scrim. -->
      <div class="l9-scrim"></div>
    </div>

    <!-- ══════════ MAIN VIEW ══════════ -->
    <div class="l9-main" :class="{ faded: focusVisible }">

      <!-- ── Header: clock, date, and the live countdown on one compact line.
           The countdown used to own a full-height band; on a 10" panel that space
           is worth far more as taller table rows. ── -->
      <header class="l9-header">
        <div class="l9-head-left">
          <div class="l9-time-display" :class="{ 'with-seconds': showSeconds }">
            <span class="l9-time-num">{{ clockNum }}</span><span class="l9-ampm">{{ clockPeriod }}</span>
          </div>
          <div class="l9-head-meta">
            <span class="l9-date-display">{{ currentDate }}</span>
            <span v-if="showHijri" class="l9-hijri-display">{{ hijriDate }}</span>
            <span v-if="showMosque && mosqueName" class="l9-mosque-name">{{ mosqueName }}</span>
          </div>
        </div>

        <div class="l9-head-next">
          <!-- countdownTotalMinutes targets *_iqamah, so name it: "NEXT - DHUHR"
               left the viewer guessing whether it meant the adhan or the iqamah. -->
          <span class="l9-head-next-label">{{ T.nextIqamahIn(nextPrayerName) }}</span>
          <span class="l9-head-next-row">
            <span class="l9-head-next-cd" :class="{ compact: countdownIsLong }">{{ countdownDisplay }}</span>
            <span v-if="countdownUnit" class="l9-head-next-unit">{{ countdownUnit }}</span>
          </span>
        </div>
      </header>

      <!-- ── Prayer table.
           Five side-by-side cards gave each prayer only ~230px of width on a 10" panel
           and repeated the ATHAN/IQAMAH labels ten times. Full-width rows with the
           labels written once as column headings leave room for far larger numerals,
           which is what actually decides legibility from across a room. ── -->
      <div class="l9-table">
        <div class="l9-thead">
          <span class="l9-th l9-th-name"></span>
          <span class="l9-th">{{ T.adhanCaps }}</span>
          <span class="l9-th">{{ T.iqamahCaps }}</span>
        </div>

        <template v-for="p in prayerCards" :key="p.rowKey || p.key">
          <div class="l9-row" :class="{ active: p.isCurrent }">
            <span class="l9-row-namecell">
              <span class="l9-row-name">{{ p.name.toUpperCase() }}</span>
              <span class="l9-row-speaker" v-if="p.speaker">{{ p.speaker }}</span>
            </span>
            <span class="l9-row-time">{{ p.adhan }}</span>
            <span class="l9-row-time l9-row-iqamah">{{ p.iqamah }}</span>
          </div>

          <!-- Sunrise belongs between Fajr and Dhuhr, where it actually falls in the
               day, rather than parked at the bottom of the table. -->
          <div
            v-if="showSunrise && sunriseTime && p.key === 'fajr'"
            class="l9-row l9-row-sun"
          >
            <span class="l9-row-name">{{ T.sunriseCaps }}</span>
            <span class="l9-row-time">{{ sunriseTime }}</span>
            <span class="l9-row-time"></span>
          </div>
        </template>
      </div>

    </div><!-- /l9-main -->

    <!-- ══════════ FOCUS VIEW ══════════ -->
    <!-- The shared focus screen (FocusScreen.vue), alternating every focusIntervalSec
         and holding all night pinned to Fajr. -->
    <FocusScreen
      :active="focusVisible"
      :prayer="focusScreenPrayer"
      :now="now"
      :lang="lang"
      :accent-color="accentColor"
      :overlay-dark="darkMode || nightFocusActive"
      :countdown="focusCountdown"
      :pill-target="pillTarget"
      :adhan-passed="adhanPassed"
      :focus-bg="focusBg"
      :focus-opacity="focusOpacity"
      :focus-photo="focusPhoto"
      :photo-image="bgImage"
      :focus-oled="focusOled"
      :focus-dim-default="focusDimDefault"
      :focus-clock="focusClock"
      :adhan-scale="adhanScale"
      :iqamah-scale="iqamahScale"
      :time-format="timeFormat"
      :hijri-offset="hijriOffset"
      :show-seconds="showSeconds"
      :show-hijri="showHijri"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { boardPhase, resetRotation, restartRotationDwell } from '../utils/viewRotation.js'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime, getNextPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahAt } from '../utils/jumuah.js'
import { darken, mixHex, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  // Focus-screen scrim: its color and how far it covers the board. Dark mode keeps
  // the original night ground regardless of what is picked here.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.94' },
  // 'on' carries the board's background image onto the focus screen, under the scrim.
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000; the dimmer (0.3-1) fades its content.
  focusOled:    { type: String, default: 'off' },
  focusDimDefault: { type: [Number, String], default: 1 },
  // 'analog' puts the dial on the focus screen's leading edge; 'digital' the readout.
  focusClock:   { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting, which decides
  // what the focus screen's countdown pill counts to.
  countdownFor: { type: String, default: 'athan' },
  prayerData:      Object,
  // Always today's slice: the night window starts from *today's* Isha iqamah even
  // once the rest of the screen has rolled over to tomorrow's times.
  todayPrayerData: Object,
  baseDate:        { type: Date, default: () => new Date() },
  // Minutes after Isha iqamah before the all-night Fajr focus takes over; 'off' disables.
  nightFocusAfterIshaMin: { type: String, default: '20' },
  nextPrayerKey:   String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  mosqueName:      String,
  // 'en' | 'ar' — flips every label and the text direction.
  lang:            { type: String, default: 'en' },
  mosqueUrl:       String,
  status:          String,
  // ── Customizable colors ──────────────────────────────────────────────────
  // Clock card background
  tileColor:        { type: String, default: '#ffffff' },
  // Text color on the clock card
  secondaryColor:   { type: String, default: '#111111' },
  // Accent color: active card gradient, iqamah time, circle gradient, pill
  accentColor:      { type: String, default: '#2cb1b6' },
  // Dark variant of accent for gradient stops (auto-derived if empty)
  accentDark:       { type: String, default: '' },
  // Next-prayer circle gradient
  circleColor:      { type: String, default: '#c31b1b' },
  circleDark:       { type: String, default: '' },
  // General background behind the layout
  mainBg:           { type: String, default: '#e0e0e0' },
  // Optional photo background
  bgImage:          { type: String, default: '' },
  bgRepeat:         { type: [Boolean, String], default: false },
  // Font-size scale factors (1 = default)
  adhanScale:       { type: String, default: '1.3' },
  iqamahScale:      { type: String, default: '1.3' },
  // Seconds between focus-view toggles. 0 = off.
  focusIntervalSec: { type: Number, default: 30 },
  // Standard display toggles
  timeFormat:   { type: String,  default: '12' },
  hijriOffset:  { type: Number,  default: 0 },
  showSeconds:  { type: Boolean, default: true },
  showHijri:    { type: Boolean, default: true },
  showSunrise:  { type: Boolean, default: true },
  showMosque:   { type: Boolean, default: true },
  mosqueLogoSrc: { type: String, default: '' },
  mosqueLogoWidth: { type: String, default: clampCqi('120px', 20, '180px') },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

// ── Derived colors ───────────────────────────────────────────────────────────
const NIGHT_BASE_FOR_ROOT = '#0c1018'

const resolvedTile = computed(() =>
  resolveThemedColor(props.tileColor, 'surface', props.darkMode)
)
const resolvedText = computed(() =>
  resolveThemedColor(props.secondaryColor, 'text', props.darkMode)
)
const resolvedAccent = computed(() =>
  resolveThemedColor(props.accentColor, 'accent', props.darkMode)
)
const resolvedCircle = computed(() =>
  resolveThemedColor(props.circleColor, 'accent', props.darkMode)
)
const resolvedMainBg = computed(() =>
  props.darkMode
    ? mixHex(NIGHT_BASE_FOR_ROOT, resolveThemedColor(props.mainBg, 'surface', true), 0.35)
    : props.mainBg
)
const resolvedAccentDark = computed(() => {
  if (props.darkMode) return darken(resolvedAccent.value, 0.75)
  return props.accentDark && props.accentDark !== '' ? props.accentDark : darken(props.accentColor)
})
const resolvedCircleDark = computed(() => {
  if (props.darkMode) return darken(resolvedCircle.value, 0.75)
  return props.circleDark && props.circleDark !== '' ? props.circleDark : darken(props.circleColor)
})
const resolvedAccentGlow = computed(() =>
  toRgba(props.darkMode ? resolvedAccent.value : props.accentColor, props.darkMode ? 0.28 : 0.4)
)
const resolvedCircleGlow = computed(() =>
  toRgba(props.darkMode ? resolvedCircle.value : props.circleColor, props.darkMode ? 0.28 : 0.4)
)
const resolvedCardOpacity = computed(() => (props.darkMode ? 0.94 : 0.88))
const resolvedClockShadow = computed(() =>
  props.darkMode ? '0 16px 40px rgba(0, 0, 0, 0.45)' : '0 20px 50px rgba(0, 0, 0, 0.15)'
)

// ── Background ───────────────────────────────────────────────────────────────
const bgImageStyle = computed(() => {
  if (!props.bgImage) return {}
  const repeat = props.bgRepeat === true || props.bgRepeat === 'true'
  return {
    backgroundImage:    `url("${props.bgImage}")`,
    backgroundSize:     repeat ? 'auto'   : 'cover',
    backgroundRepeat:   repeat ? 'repeat' : 'no-repeat',
    backgroundPosition: repeat ? ''       : 'center',
  }
})

const { lang, dir, T, localeTag, dateLocale } = useLayoutLang(props, {
  en: {
    untilIqamah: 'UNTIL IQAMAH', untilKhutbah: 'UNTIL KHUTBAH', minShort: 'min', hourShort: 'h', minuteShort: 'm',
    nextIqamahIn: name => `${name} IQAMAH IN`,
  },
  ar: {
    untilIqamah: 'حتى الإقامة', untilKhutbah: 'حتى الخطبة', minShort: 'دقيقة', hourShort: 'س', minuteShort: 'د',
    nextIqamahIn: name => `الإقامة بعد — ${name}`,
  },
})

// ── Clock & dates ────────────────────────────────────────────────────────────
const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    isFajr: false, isDhuhr: false },
]

const now       = ref(debugNow())
const showFocus = ref(false)
let clockInterval  = null

const hour12   = computed(() => props.timeFormat !== '24')
const clockParts = computed(() => {
  return formatClock(now.value, {
    hour12: hour12.value, seconds: props.showSeconds, hour: '2-digit', split: true, locale: localeTag.value
  })
})
const clockNum    = computed(() => clockParts.value.num ?? formatClock(now.value, { hour12: hour12.value, seconds: props.showSeconds, hour: '2-digit', locale: localeTag.value }))
const clockPeriod = computed(() => clockParts.value.period ?? '')
const currentDate = computed(() =>
  now.value.toLocaleDateString(dateLocale.value, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
)
// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(now.value, props.hijriOffset, lang.value))

// ── Prayer helpers ───────────────────────────────────────────────────────────
const displayTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: true, locale: localeTag.value })
const displayPrayerTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: false })
const prayerTime  = (key, suffix) => {
  if (!props.prayerData) return '--:--'
  const p   = PRAYERS.find(x => x.key === key)
  const raw = props.prayerData[key + suffix]
  return raw && p ? displayPrayerTime(getPrayerDateTime(raw, p.isFajr, p.isDhuhr)) : '--:--'
}


/** The row the board is counting down to. On Friday the Dhuhr key maps to several
 *  rows, so pick the session still ahead rather than the first one. */
function rowForKey(rows, key) {
  const matches = rows.filter(r => r.key === key)
  return matches.find(r => r.isCurrent) || matches[0] || null
}

const nextCard = computed(() => rowForKey(prayerCards.value, props.nextPrayerKey))
const nextPrayerName = computed(() =>
  nextCard.value ? String(nextCard.value.name).toUpperCase() : '--'
)

const nextAdhan  = computed(() => nextCard.value?.adhan ?? '--:--')
const nextIqamah = computed(() => nextCard.value?.iqamah ?? '--:--')

const prayerCards = computed(() => {
  const nk = props.nextPrayerKey
  const rows = PRAYERS.map(p => ({
    key:       p.key,
    name:      T.value[p.key],
    adhan:     prayerTime(p.key, '_azaan'),
    iqamah:    prayerTime(p.key, '_iqamah'),
    isCurrent: nk === p.key,
  }))
  // On Friday the Dhuhr card becomes one card per Jumu'ah session.
  return withJumuahRows(rows, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:    `jumuah-${i}`,
    name:      jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:    displayTime(jumuahDate(s.time)),
    speaker:   s.speaker || '',
    isCurrent: dhuhr.isCurrent && isNext,
  }))
})

const sunriseTime = computed(() => {
  if (!props.prayerData?.sunrise) return null
  return displayTime(getPrayerDateTime(props.prayerData.sunrise, true, false))
})

// ── Countdown (compact time to next iqamah) ─────────────────────────────────
const countdownTotalMinutes = computed(() => {
  if (!props.nextPrayerKey || !props.prayerData) return null
  const p = PRAYERS.find(x => x.key === props.nextPrayerKey)
  if (!p) return null
  const raw = props.prayerData[p.key + '_iqamah']
  if (!raw) return null
  // A Jumu'ah session counts down to its khutbah; Dhuhr's iqamah may be long past.
  const khutbah = props.nextPrayerKey === 'dhuhr' ? nextJumuahAt(props.jumuahPrayers, now.value) : null
  const target = khutbah || getNextPrayerDateTime(raw, p.isFajr, p.isDhuhr, now.value)
  const diff   = target - now.value
  if (diff <= 0) return 0
  return Math.ceil(diff / 60000)
})

const countdownIsLong = computed(() =>
  countdownTotalMinutes.value != null && countdownTotalMinutes.value >= 60
)

const countdownDisplay = computed(() => {
  const total = countdownTotalMinutes.value
  if (total == null) return '--'
  if (total < 60) return String(total)
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0
    ? `${hours}${T.value.hourShort}`
    : `${hours}${T.value.hourShort} ${minutes}${T.value.minuteShort}`
})

const countdownUnit = computed(() => {
  if (countdownTotalMinutes.value == null) return ''
  return countdownIsLong.value ? '' : T.value.minShort
})

// ── Focus screen ─────────────────────────────────────────────────────────────
// The night focus, the two-stage countdown and the screen itself are shared with
// every other layout — see FocusScreen.vue and utils/focusScreen.js. This layout
// decides only *when* the screen is up.
const {
  nightFocusActive, adhanPassed, pillTarget, awaitingIqamah,
  countdown: focusCountdown,
} = useFocusScreen({
  now:                    now,
  prayerData:             () => props.prayerData,
  todayPrayerData:        () => props.todayPrayerData,
  nextPrayerKey:          () => props.nextPrayerKey,
  jumuahPrayers:          () => props.jumuahPrayers,
  nightFocusAfterIshaMin: () => props.nightFocusAfterIshaMin,
  countdownFor:           () => props.countdownFor,
  darkMode:               () => props.darkMode,
  baseDate:               () => props.baseDate,
  focusIsJumuah:          () => !!focusCard.value?.isJumuah,
})

// A horizontal swipe parks the view on one side until the next tick (day) or the
// next swipe (night, where nothing alternates to hand it back).
const manualView = ref(null)     // null = automatic, true = focus, false = table

const focusVisible = computed(() => {
  if (manualView.value !== null) return manualView.value
  // awaitingIqamah holds the screen from the adhan to the iqamah.
  return nightFocusActive.value || awaitingIqamah.value || showFocus.value
})

/** Fajr all night; otherwise whatever is next. */
const focusKey = computed(() => (nightFocusActive.value ? 'fajr' : props.nextPrayerKey))
const focusCard = computed(() => rowForKey(prayerCards.value, focusKey.value))
const focusPrayerName = computed(() =>
  focusCard.value ? String(focusCard.value.name).toUpperCase() : '--'
)
const focusAdhan  = computed(() => focusCard.value?.adhan ?? '--:--')
const focusIqamah = computed(() => focusCard.value?.iqamah ?? '--:--')
/** The shared screen takes one prayer object; this layout keeps its pieces apart. */
const focusScreenPrayer = computed(() => ({
  name:     focusPrayerName.value,
  adhan:    focusAdhan.value,
  iqamah:   focusIqamah.value,
  speaker:  focusCard.value?.speaker || '',
  isJumuah: !!focusCard.value?.isJumuah,
}))

// ── Focus-view interval ──────────────────────────────────────────────────────
/** One alternation tick. A manual swipe is handed back to the clock during the day;
 *  at night nothing alternates, so the swipe stands until the next one.
 *  The alternation now comes off the board's shared rotation clock
 *  (utils/viewRotation.js), so the events and Jumu'ah slides take their slot between
 *  two of these views instead of cutting across one of them. */
function onFocusTick() {
  if (!nightFocusActive.value && !awaitingIqamah.value) manualView.value = null
  showFocus.value = boardPhase.value % 2 === 1
}
watch(boardPhase, onFocusTick)

/** @param resetView false keeps the current view and only restarts the clock. */
function restartFocusInterval(resetView = true) {
  if (resetView) {
    showFocus.value = false
    resetRotation()
  } else {
    restartRotationDwell(showFocus.value)
  }
}

// ── Swipe to switch views ────────────────────────────────────────────────────
const SWIPE_MIN_PX = 60          // shorter drags are taps or jitter
const SWIPE_MAX_MS = 1500        // slow panels add dispatch latency
const swipeStart = ref(null)

function toggleView() {
  manualView.value = !focusVisible.value
  showFocus.value = manualView.value          // keep the auto state in step
  restartFocusInterval(false)                 // restart the countdown, keep this view
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  swipeStart.value = { x: e.clientX, y: e.clientY, t: Date.now() }
}

function onPointerUp(e) {
  const start = swipeStart.value
  swipeStart.value = null
  if (!start) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Date.now() - start.t > SWIPE_MAX_MS) return
  // Horizontal intent only, so a stray vertical drag doesn't flip the view.
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  toggleView()
}

// Hand control back to the automatic behaviour when night starts or ends.
watch(nightFocusActive, () => { manualView.value = null })
watch(awaitingIqamah,   () => { manualView.value = null })

// Wrapped: watch() would pass the new interval in as restartFocusInterval's resetView.
watch(() => props.focusIntervalSec, () => restartFocusInterval())

onMounted(() => {
  clockInterval = setInterval(() => { now.value = debugNow() }, 1000)
  restartFocusInterval()
})
onUnmounted(() => {
  clearInterval(clockInterval)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() }, toggleView)
</script>

<style>
/* ──────────────────────────────────────────────────────────────────────────────
   Layout 9 — Masidal Style
   All classes namespaced under .l9-root to avoid collision with other layouts.
   CSS custom colors use v-bind() so they react live to prop changes.
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Root ── */
.l9-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  background: v-bind(resolvedMainBg);
  touch-action: none;            /* let horizontal swipes reach the handlers */
}

/* ── Background layers ── */
.l9-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: v-bind(resolvedMainBg);
}
.l9-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.l9-plain-bg {
  position: absolute;
  inset: 0;
  background: v-bind(resolvedMainBg);
}
.l9-overlay {
  position: absolute;
  inset: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}

/* ── Main container ──
   The main and focus screens alternate every 30s, so they are built on one visual
   system: dark ground, white type, accent reserved for emphasis. Sized for a 10"
   1280x800 panel read from across a room - at that size what decides legibility is
   how few things share the screen, not how they are styled. */
.l9-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.6vh, 18px);
  padding: clamp(12px, 2.2vh, 26px) clamp(16px, 2.2vw, 38px);
  transition: opacity 0.8s ease;
  min-height: 0;
}
.l9-main.faded { opacity: 0; pointer-events: none; }

.l9-mosque-logo { display: none; }

/* The board's own ground. The focus screen (FocusScreen.vue) stands on its own
   deep slate, so the two no longer share one. */
.l9-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 38%, rgba(22,22,27,0.88), rgba(0,0,0,0.94));
  pointer-events: none;
}

/* ── Header ── */
.l9-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(12px, 2vw, 32px);
  padding: 0 clamp(6px, 0.8vw, 14px) clamp(8px, 1.4vh, 16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
  flex-shrink: 0;
}
.l9-head-left { display: flex; flex-direction: column; min-width: 0; }

/* Georgia reads as elegant up close and turns to mush at distance; a heavy
   sans with tabular figures holds its shape across a room. */
.l9-time-display {
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: clamp(2.1rem, 7vh, 4.8rem);
  font-weight: 700;
  color: #fff;
  line-height: 1;
  display: grid;
  grid-template-columns: max-content clamp(1.1rem, 2.8vh, 2rem);
  align-items: baseline;
  column-gap: 7px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
.l9-time-num {
  display: inline-block;
  width: 5ch;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.l9-time-display.with-seconds .l9-time-num { width: 8ch; }
.l9-ampm {
  font-size: clamp(0.8rem, 2.1vh, 1.5rem);
  font-weight: 700;
  text-align: start;
  color: rgba(255, 255, 255, 0.7);
}

/* Date, Hijri and mosque on one line - three stacked lines of small text was
   three chances to be unreadable. */
.l9-head-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: clamp(6px, 0.9vw, 14px);
  margin-top: clamp(2px, 0.5vh, 6px);
}
.l9-date-display {
  color: rgba(255, 255, 255, 0.92);
  font-size: clamp(0.95rem, 2.4vh, 1.55rem);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 800;
}
.l9-hijri-display {
  color: v-bind(resolvedAccent);
  font-size: clamp(0.9rem, 2.2vh, 1.45rem);
  font-weight: 700;
}
.l9-mosque-name {
  color: rgba(255, 255, 255, 0.5);
  font-size: clamp(0.78rem, 1.8vh, 1.15rem);
  font-weight: 600;
}

/* The one live number on this screen, so it gets a card of its own. */
.l9-head-next {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  padding: clamp(6px, 1.1vh, 14px) clamp(14px, 1.8vw, 26px);
  border-radius: clamp(12px, 1.8vh, 18px);
  /* A solid fill here competed with the filled active row for attention, and the
     default circle colour is red - next to the teal accent that reads as an error
     state rather than a countdown. Recessed glass keeps one focal point on screen
     while circleColor still drives the chrome. */
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid v-bind(resolvedCircle);
  box-shadow: none;
  color: #fff;
}
.l9-head-next-label {
  font-size: clamp(0.75rem, 1.95vh, 1.25rem);
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  /* Saturated red on black is the hardest thing on this screen to read at a small
     size; circleColor still identifies the card through its border. */
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.2;
}
.l9-head-next-row { display: flex; align-items: baseline; gap: 7px; }
.l9-head-next-cd {
  font-size: clamp(1.45rem, 4.4vh, 3rem);
  font-weight: 700;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
.l9-head-next-cd.compact { font-size: clamp(1rem, 2.8vh, 1.9rem); white-space: nowrap; }
.l9-head-next-unit {
  font-size: clamp(0.72rem, 1.8vh, 1.1rem);
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.9;
}

/* ── Prayer table ──
   Five side-by-side cards gave each prayer ~230px of width on a 10" panel and
   repeated the ATHAN/IQAMAH labels ten times. Full-width rows with the labels
   written once as column headings roughly doubled every numeral. */
.l9-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.9vh, 11px);
}

.l9-thead,
.l9-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  align-items: center;
  column-gap: clamp(8px, 1.4vw, 22px);
  padding: 0 clamp(18px, 2.6vw, 42px);
}

.l9-thead { flex-shrink: 0; }
.l9-th {
  font-size: clamp(0.9rem, 2.3vh, 1.5rem);
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
}
.l9-th-name { text-align: left; }

/* Glass rows rather than opaque tiles: the mosque's background still shows
   through, and nothing competes with the active row. */
.l9-row {
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: clamp(10px, 1.7vh, 20px);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.l9-row.active {
  background: linear-gradient(135deg, v-bind(resolvedAccent), v-bind(resolvedAccentDark));
  border-color: transparent;
  box-shadow: 0 10px 30px v-bind(resolvedAccentGlow);
}

.l9-row-name {
  font-size: clamp(1.25rem, 5vh, 3.4rem);
  font-weight: 800;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
}
.l9-row.active .l9-row-name { color: #fff; }

/* The khateeb sits under the session name inside the first column, so adding it
   never changes the table's three-column rhythm. */
.l9-row-namecell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(2px, 0.6vh, 7px);
  min-width: 0;
}
.l9-row-speaker {
  font-size: clamp(0.72rem, 2.1vh, 1.5rem);
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
}
.l9-row.active .l9-row-speaker { color: rgba(255, 255, 255, 0.88); }

.l9-row-time {
  font-size: calc(clamp(1.5rem, 6.4vh, 4.4rem) * v-bind(adhanScale));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
.l9-row-iqamah {
  font-size: calc(clamp(1.5rem, 6.4vh, 4.4rem) * v-bind(iqamahScale));
  color: v-bind(resolvedAccent);
  font-weight: 800;
}
.l9-row.active .l9-row-time,
.l9-row.active .l9-row-iqamah { color: #fff; }

/* Sunrise is informational, not a prayer - shorter row, recessed. */
.l9-row-sun {
  flex: 0.58;
  background: transparent;
  border-color: transparent;
}
.l9-row-sun .l9-row-name,
.l9-row-sun .l9-row-time {
  font-size: clamp(1rem, 3.2vh, 2.2rem);
  color: rgba(255, 255, 255, 0.55);
  font-weight: 700;
}

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic, which the Segoe/Roboto stack above does not. */
.l9-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms
   apart, so letter-spacing is dropped wherever the script is RTL. */
[dir='rtl'] .l9-date-display,
[dir='rtl'] .l9-head-next-label,
[dir='rtl'] .l9-th,
[dir='rtl'] .l9-row-name {
  letter-spacing: 0;
}
/* Bare times are Latin numerals; keep them running left-to-right so a leading "0"
   is not flipped to the wrong end. The countdowns are left alone — they carry
   Arabic unit letters ("5س 30د"), which bidi already orders correctly. */
[dir='rtl'] .l9-time-num {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
