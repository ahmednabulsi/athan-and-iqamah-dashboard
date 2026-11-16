<template>
  <div
    class="l7-root"
    :dir="dir"
    :class="{ 'l7-faded': focusVisible, 'is-dark': darkMode }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <PhotoBackdrop :image="photoImage" :repeat="photoRepeat" :text-color="textColor" />

    <!-- Sunrise: top-right corner -->
    <div class="l7-sunrise-corner" v-if="showSunrise && sunriseTime">
      <span class="l7-sunrise-label">{{ T.sunriseCaps }}</span>
      <span class="l7-sunrise-time">{{ sunriseTime }}</span>
    </div>
    <img v-if="mosqueLogoSrc" class="l7-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />

    <!-- Header: centered clock + date -->
    <div class="l7-header">
      <div class="l7-clock">{{ clock }}</div>
      <div class="l7-date">{{ gregorianDate }}</div>
      <div class="l7-hijri" v-if="showHijri && hijriDate">{{ hijriDate }}</div>
    </div>

    <!-- Prayer grid: 5 horizontal cards -->
    <div class="l7-grid">
      <div
        v-for="p in cardPrayers"
        :key="p.key"
        class="l7-card"
        :class="{ active: nextPrayerKey === p.key }"
      >
        <div class="l7-card-name">{{ p.name }}</div>
        <div class="l7-card-adhan">{{ p.adhan }}</div>
        <div class="l7-card-label">{{ T.iqamah }}</div>
        <div class="l7-card-iqamah">{{ p.iqamah }}</div>
      </div>
    </div>

    <!-- Countdown bottom bar. On Friday it also carries the sessions, parked on its
         trailing side so the countdown itself stays centred on the board. -->
    <div class="l7-countdown" :class="{ 'has-jumuah': jumuahSessions.length }">
      <div class="l7-cd-main">
        <div class="l7-cd-label">{{ countdownLabel }}</div>
        <div class="l7-cd-val">{{ countdown.text }}</div>
      </div>
      <div class="l7-jumuah" v-if="jumuahSessions.length">
        <div
          v-for="s in jumuahSessions"
          :key="s.key"
          class="l7-jumuah-item"
          :class="{ active: s.isNext }"
        >
          <div class="l7-jumuah-name">{{ s.name }}</div>
          <div class="l7-jumuah-time">{{ s.time }}</div>
          <div class="l7-jumuah-speaker" v-if="s.speaker">{{ s.speaker }}</div>
        </div>
      </div>
    </div>

    <!-- Mosque name: fixed bottom-left -->
    <div class="l7-mosque" v-if="showMosque && props.mosqueName">📍 {{ props.mosqueName }}</div>

    <!-- The shared focus screen (FocusScreen.vue), alternating every focusIntervalSec
         and holding all night pinned to Fajr. -->
    <FocusScreen
      :active="focusVisible"
      :prayer="focusPrayer"
      :now="now"
      :lang="lang"
      :accent-color="accentColor"
      :overlay-dark="overlayDark"
      :countdown="focusCountdown"
      :pill-target="pillTarget"
      :adhan-passed="adhanPassed"
      :focus-bg="focusBg"
      :focus-opacity="focusOpacity"
      :focus-photo="focusPhoto"
      :photo-image="photoImage"
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
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import PhotoBackdrop from './PhotoBackdrop.vue'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime, getNextPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahAt, nextJumuahIndex } from '../utils/jumuah.js'
import { hexToRgb, mixHex, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  // Focus-screen scrim: its color and how far it covers the board. Dark mode keeps
  // its own night palette regardless — see FocusScreen.vue.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.92' },
  // 'on' carries the board's background photo onto the focus screen, under the scrim.
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000; the dimmer (0.3-1) fades its content.
  focusOled:    { type: String, default: 'off' },
  focusDimDefault: { type: [Number, String], default: 1 },
  // 'analog' puts the dial on the focus screen's leading edge; 'digital' the readout.
  focusClock:   { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting, which decides
  // what the focus screen's countdown pill counts to.
  countdownFor: { type: String, default: 'athan' },
  // Optional background photo — see PhotoBackdrop.vue. '' keeps the color background.
  photoImage:   { type: String, default: '' },
  photoRepeat:  { type: [Boolean, String], default: false },
  prayerData:    Object,
  // Always today's slice: the night window starts from *today's* Isha iqamah even
  // once the rest of the screen has rolled over to tomorrow's times.
  todayPrayerData: Object,
  baseDate:      { type: Date, default: () => new Date() },
  // Minutes after Isha iqamah before the all-night Fajr focus takes over; 'off' disables.
  nightFocusAfterIshaMin: { type: String, default: '20' },
  nextPrayerKey: String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  mosqueName:    String,
  // 'en' | 'ar' — flips every label and the text direction.
  lang:          { type: String, default: 'en' },
  // Native-configurable colors (Android toolbar). Reactive → live updates.
  textColor:    { type: String, default: '#EAEAEA' },
  accentColor:  { type: String, default: '#CD7F32' },
  bgColor:      { type: String, default: '#0F0F1A' },
  surfaceColor: { type: String, default: '#111111' },
  // Font-size scale factors (multiply the responsive clamp), 1 = default.
  adhanScale:     { type: String, default: '1' },
  iqamahScale:    { type: String, default: '1' },
  countdownScale: { type: String, default: '1' },
  // Seconds between the main ↔ focus view toggle. 0 (or less) disables it.
  focusIntervalSec: { type: Number, default: 30 },
  timeFormat:       { type: String, default: '12' },
  hijriOffset:      { type: Number, default: 0 },
  showSeconds:      { type: Boolean, default: true },
  showHijri:        { type: Boolean, default: true },
  showSunrise:      { type: Boolean, default: true },
  showMosque:       { type: Boolean, default: true },
  mosqueLogoSrc:    { type: String, default: '' },
  mosqueLogoWidth:  { type: String, default: clampCqi('120px', 20, '180px') },
  backdropColor:    { type: String, default: '#000000' },
  backdropOpacity:  { type: [Number, String], default: 0 },
  darkMode:         { type: Boolean, default: false },
})

const { lang, dir, T, localeTag } = useLayoutLang(props)

const NIGHT_BASE_FOR_ROOT = '#0c1018'

const resolvedText = computed(() =>
  resolveThemedColor(props.textColor, 'text', props.darkMode)
)
const resolvedAccent = computed(() =>
  resolveThemedColor(props.accentColor, 'accent', props.darkMode)
)
const resolvedBg = computed(() =>
  props.darkMode
    ? mixHex(NIGHT_BASE_FOR_ROOT, resolveThemedColor(props.bgColor, 'panel', true), 0.35)
    : props.bgColor
)
const resolvedSurface = computed(() =>
  resolveThemedColor(props.surfaceColor, 'surface', props.darkMode)
)
const accentGlow = computed(() =>
  toRgba(props.darkMode ? resolvedAccent.value : props.accentColor, props.darkMode ? 0.35 : 0.5)
)
const resolvedCardBorder = computed(() =>
  props.darkMode
    ? mixHex(resolvedSurface.value, resolvedAccent.value, 0.22)
    : '#1e1e1e'
)
const resolvedCountdownBorder = computed(() =>
  props.darkMode
    ? mixHex(resolvedBg.value, resolvedAccent.value, 0.25)
    : '#1e1e1e'
)
const resolvedActiveLabel = computed(() => 'rgba(255, 255, 255, 0.65)')
const resolvedFocusDate = computed(() => 'rgba(255, 255, 255, 0.55)')
const resolvedFocusDivider = computed(() =>
  props.darkMode ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.12)'
)

const now       = ref(debugNow())
const showFocus = ref(false)
let clockInterval = null

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    azaanKey: 'fajr_azaan',    iqamahKey: 'fajr_iqamah',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   azaanKey: 'dhuhr_azaan',   iqamahKey: 'dhuhr_iqamah',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     azaanKey: 'asr_azaan',     iqamahKey: 'asr_iqamah',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', azaanKey: 'maghrib_azaan', iqamahKey: 'maghrib_iqamah', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    azaanKey: 'isha_azaan',    iqamahKey: 'isha_iqamah',    isFajr: false, isDhuhr: false },
]

const hour12 = computed(() => props.timeFormat !== '24')
const displayTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: false })

/** The five daily prayers — and the five cards across the board. The row is sized for
 *  exactly these: a mosque with three or four Jumu'ah sessions pushed seven or eight
 *  cards into it and the last ones ran off the edge, so the sessions get a strip of
 *  their own in the countdown bar (see `jumuahSessions`). */
const cardPrayers = computed(() => {
  if (!props.prayerData) return PRAYERS.map(p => ({ ...p, name: T.value[p.key], adhan: '--:--', iqamah: '--:--' }))
  return PRAYERS.map(p => ({
    ...p,
    name:   T.value[p.key],
    adhan:  displayTime(getPrayerDateTime(props.prayerData[p.azaanKey],  p.isFajr, p.isDhuhr)),
    iqamah: displayTime(getPrayerDateTime(props.prayerData[p.iqamahKey], p.isFajr, p.isDhuhr)),
  }))
})

/** The same list with Friday's Dhuhr row expanded into one row per session. The focus
 *  screen reads from this one: whatever the cards show, the board's headline on a
 *  Friday has to be the session that is actually next. */
const prayers = computed(() =>
  withJumuahRows(cardPrayers.value, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:   `jumuah-${i}`,
    name:     jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:   displayTime(jumuahDate(s.time)),
    speaker:  s.speaker || '',
    isJumuah: true,
    isNextJumuah: isNext,
  }), now.value)
)

/** Friday's sessions for the strip beside the countdown. Empty on any other day. */
const jumuahSessions = computed(() => {
  const list = props.jumuahPrayers || []
  const nextIdx = nextJumuahIndex(list, now.value)
  return list.map((s, i) => ({
    key:     `jumuah-${i}`,
    name:    jumuahName(s, { lang: lang.value, index: i, count: list.length, label: T.value.jumuah }),
    time:    displayTime(jumuahDate(s.time, now.value)),
    speaker: s.speaker || '',
    isNext:  i === nextIdx,
  }))
})

const clock = computed(() =>
  formatClock(now.value, { hour12: hour12.value, seconds: props.showSeconds, locale: localeTag.value })
)

const gregorianDate = computed(() =>
  now.value.toLocaleDateString(localeTag.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(now.value, props.hijriOffset, lang.value))

const currentPrayer = computed(() => {
  // Friday maps the Dhuhr key onto several rows; follow the session still ahead.
  const matches = prayers.value.filter(p => p.key === props.nextPrayerKey)
  return matches.find(p => p.isNextJumuah) || matches[0] || null
})

const sunriseTime = computed(() => {
  if (!props.prayerData?.sunrise) return null
  const d = getPrayerDateTime(props.prayerData.sunrise, true, false)
  return displayTime(d)
})

// ── Focus screen ────────────────────────────────────────────────────────────
// The night focus, the two-stage countdown and the screen itself are shared with
// every other layout — see FocusScreen.vue and utils/focusScreen.js. This layout
// decides only *when* the screen is up.
const {
  nightFocusActive, adhanPassed, pillTarget, awaitingIqamah,
  countdown: focusCountdown, sidebar: countdown,
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
  focusIsJumuah:          () => !!focusPrayer.value?.isJumuah,
})

const manualView = ref(null)     // null = automatic, true = focus, false = cards
const focusVisible = computed(() => {
  if (manualView.value !== null) return manualView.value
  // awaitingIqamah holds the screen from the adhan to the iqamah.
  return nightFocusActive.value || awaitingIqamah.value || showFocus.value
})
const overlayDark = computed(() => props.darkMode || nightFocusActive.value)

/** The bottom bar names what it is counting to and switches with it: the adhan until
 *  it is called, then the iqamah (a Friday Dhuhr counts to its khutbah). Unlike the
 *  focus pill this ignores Countdown For — the bar is a permanent fixture of the board
 *  and must never go blank. */
const CD_LABEL = { adhan: 'adhanIn', iqamah: 'iqamahIn', khutbah: 'khutbahIn' }
const countdownLabel = computed(() => T.value[CD_LABEL[countdown.value.target]])

/** Fajr all night; otherwise whatever is next. */
const focusPrayer = computed(() =>
  nightFocusActive.value
    ? (prayers.value.find(p => p.key === 'fajr') || currentPrayer.value)
    : currentPrayer.value
)

// ── Swipe to switch views ───────────────────────────────────────────────────
const SWIPE_MIN_PX = 60
const SWIPE_MAX_MS = 1500        // generous: slow panels add dispatch latency
const swipeStart = ref(null)

function toggleView() {
  manualView.value = !focusVisible.value
  showFocus.value = manualView.value
  restartFocusInterval(false)
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
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  toggleView()
}
watch(nightFocusActive, () => { manualView.value = null })
watch(awaitingIqamah,   () => { manualView.value = null })

/** The alternation now comes off the board's shared rotation clock
 *  (utils/viewRotation.js), so the events and Jumu'ah slides take their slot between
 *  two of these views instead of cutting across one of them. */
function onFocusTick() {
  if (!nightFocusActive.value && !awaitingIqamah.value) manualView.value = null
  showFocus.value = boardPhase.value % 2 === 1
}
watch(boardPhase, onFocusTick)

// (Re)arm the focus-view toggle. focusIntervalSec <= 0 disables it.
function restartFocusInterval(resetView = true) {
  if (resetView) {
    showFocus.value = false
    resetRotation()
  } else {
    restartRotationDwell(showFocus.value)
  }
}

onMounted(() => {
  clockInterval = setInterval(() => { now.value = debugNow() }, 1000)
  restartFocusInterval()
})
// Wrapped: watch() would pass the new interval in as restartFocusInterval's resetView.
watch(() => props.focusIntervalSec, () => restartFocusInterval())
onUnmounted(() => {
  clearInterval(clockInterval)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() }, toggleView)
</script>

<style scoped>
* { box-sizing: border-box; }

.l7-root {
  position: fixed;
  inset: 0;
  background: v-bind(resolvedBg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
  color: v-bind(resolvedText);
  isolation: isolate;
}
.l7-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}


/* ── Sunrise corner ──────────────────────────── */
.l7-sunrise-corner {
  position: absolute;
  top: clamp(14px, 2.5vh, 30px);
  right: clamp(20px, 2.5vw, 40px);
  text-align: right;
  line-height: 1.2;
  z-index: 1;
}

.l7-mosque-logo {
  position: absolute;
  top: clamp(14px, 2.5vh, 30px);
  left: clamp(20px, 2.5vw, 40px);
  z-index: 1;
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
}

.l7-sunrise-label {
  display: block;
  font-size: clamp(11px, 1.5vw, 18px);
  color: v-bind(resolvedText);
  letter-spacing: 3px;
  text-transform: uppercase;
}

.l7-sunrise-time {
  font-size: clamp(22px, 3.5vw, 44px);
  font-weight: 700;
  color: v-bind(resolvedText);
}

/* ── Header ──────────────────────────────────── */
.l7-header {
  text-align: center;
  padding: clamp(14px, 2.5vh, 30px) clamp(28px, 4vw, 60px) clamp(8px, 1.5vh, 18px);
  flex-shrink: 0;
}

.l7-clock {
  font-size: clamp(52px, 9vw, 116px);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 1;
  color: v-bind(resolvedText);
}

.l7-date {
  font-size: clamp(13px, 1.6vw, 20px);
  color: v-bind(resolvedText);
  margin-top: 4px;
}

.l7-hijri {
  font-size: clamp(11px, 1.3vw, 16px);
  color: v-bind(resolvedAccent);
  font-weight: 700;
  letter-spacing: 2px;
  margin-top: 2px;
}

/* ── Prayer grid ─────────────────────────────── */
.l7-grid {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: clamp(26px, 2vh, 28px) clamp(20px, 2.5vw, 40px);
  gap: clamp(8px, 1.2vw, 18px);
  min-height: 0;
}

.l7-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: v-bind(resolvedSurface);
  border-radius: 12px;
  border: 1px solid v-bind(resolvedCardBorder);
  padding: clamp(14px, 2vh, 28px) clamp(6px, 0.8vw, 14px);
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
  gap: clamp(4px, 0.8vh, 12px);
}

.l7-card.active {
  background: v-bind(resolvedAccent);
  transform: scale(1.05);
  box-shadow: 0 0 28px v-bind(accentGlow);
  border-color: transparent;
}

.l7-card-name {
  font-size: clamp(14px, 2.2vw, 28px);
  font-weight: 700;
  text-transform: uppercase;
  color: v-bind(resolvedText);
  letter-spacing: 1px;
}

.l7-card.active .l7-card-name { color: #fff; }

.l7-card-adhan {
  font-size: calc(clamp(28px, 5vw, 66px) * v-bind(adhanScale));
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
}

.l7-card.active .l7-card-adhan { color: #fff; }

.l7-card-label {
  font-size: clamp(10px, 1.2vw, 16px);
  color: v-bind(resolvedText);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.l7-card.active .l7-card-label { color: v-bind(resolvedActiveLabel); }

.l7-card-iqamah {
  font-size: calc(clamp(28px, 7vw, 66px) * v-bind(iqamahScale));
  font-weight: 700;
  color: v-bind(resolvedAccent);
  line-height: 1;
}

.l7-card.active .l7-card-iqamah { color: #fff; }

/* ── Countdown bottom bar ────────────────────── */
.l7-countdown {
  position: relative;
  z-index: 25;
  background: v-bind(resolvedBg);
  border-top: 1px solid v-bind(resolvedCountdownBorder);
  text-align: center;
  padding: clamp(12px, 1.8vh, 22px) 20px clamp(14px, 2vh, 24px);
  flex-shrink: 0;
}

/* ── Friday sessions ─────────────────────────── */
/* The bar becomes a row: the countdown keeps its place at the head of it and the
   sessions sit alongside, rather than one drawn over the other. The countdown gives
   up some size for them — four sessions and a 10vw clock do not share 1280px. */
.l7-countdown.has-jumuah {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 2.5vw, 44px);
}
.l7-countdown.has-jumuah .l7-cd-val { font-size: calc(clamp(30px, 5.5vw, 64px) * v-bind(countdownScale)); }
.l7-jumuah {
  display: flex;
  align-items: stretch;
  gap: clamp(6px, 0.8vw, 14px);
  min-width: 0;
}
.l7-jumuah-item {
  min-width: clamp(74px, 8vw, 120px);
  max-width: clamp(110px, 13vw, 190px);
  padding: clamp(4px, 0.6vh, 9px) clamp(6px, 0.8vw, 14px);
  border: 1px solid v-bind(resolvedCardBorder);
  border-radius: 10px;
  background: v-bind(resolvedSurface);
  text-align: center;
}
.l7-jumuah-item.active {
  border-color: v-bind(resolvedAccent);
  background: v-bind(resolvedAccent);
}
.l7-jumuah-name {
  font-size: clamp(10px, 1.05vw, 15px);
  font-weight: 700;
  color: v-bind(resolvedText);
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.l7-jumuah-time {
  font-size: clamp(17px, 1.9vw, 30px);
  font-weight: 700;
  color: v-bind(resolvedAccent);
  line-height: 1.15;
}
.l7-jumuah-speaker {
  font-size: clamp(9px, 0.95vw, 13px);
  font-weight: 600;
  color: v-bind(resolvedText);
  opacity: 0.75;
  line-height: 1.2;
  /* Two lines of a khateeb's name, then an ellipsis: the strip sits in the
     countdown bar and cannot grow taller without pushing the clock off. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.l7-jumuah-item.active .l7-jumuah-name,
.l7-jumuah-item.active .l7-jumuah-speaker,
.l7-jumuah-item.active .l7-jumuah-time { color: #fff; }   /* matches the active card */

.l7-cd-label {
  font-size: clamp(9px, 1.1vw, 13px);
  color: v-bind(resolvedAccent);
  font-weight: 700;
  letter-spacing: 5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.l7-cd-val {
  font-size: calc(clamp(36px, 10vw, 90px) * v-bind(countdownScale));
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
}

/* ── Mosque name: fixed bottom-left ──────────── */
.l7-mosque {
  position: absolute;
  bottom: clamp(10px, 1.5vh, 18px);
  left: clamp(14px, 1.8vw, 28px);
  font-size: clamp(11px, 1.3vw, 16px);
  font-weight: 700;
  color: v-bind(resolvedText);
  pointer-events: none;
  z-index: 1;
}

/* ── Focus overlay ───────────────────────────── */
/* The screen itself is FocusScreen.vue; the board underneath just steps back. */
/* The countdown bar used to be exempt here because the old overlay left room for it;
   the shared screen covers the board, and the bar sits at z-index 25 — above it — so it
   has to fade with everything else. */
.l7-root.l7-faded > *:not(.fs-root) {
  opacity: 0;
  transition: opacity 0.8s ease;
}

.l7-root { touch-action: none; }   /* let horizontal swipes reach the handlers */

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic, which the Latin stack above does not. */
[dir='rtl'] .l7-root,
.l7-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', Arial, Helvetica, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms
   apart, so letter-spacing is dropped wherever the script is RTL. */
[dir='rtl'] .l7-sunrise-label,
[dir='rtl'] .l7-hijri,
[dir='rtl'] .l7-card-name,
[dir='rtl'] .l7-card-label,
[dir='rtl'] .l7-cd-label {
  letter-spacing: 0;
}
/* Times and countdowns are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .l7-sunrise-time,
[dir='rtl'] .l7-card-adhan,
[dir='rtl'] .l7-card-iqamah,
[dir='rtl'] .l7-cd-val {
  direction: ltr;
  unicode-bidi: isolate;
}

.l7-root .l7-card { border-radius: 16px; }

.l7-root.l7-faded > *:not(.fs-root) {
  transition: opacity 400ms cubic-bezier(0.2, 0, 0, 1);   /* M3 emphasized */
}

</style>
