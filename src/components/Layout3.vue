<template>
  <div
    class="l3-root"
    :dir="dir"
    :class="{ 'l3-dark': darkMode, 'l3-faded': overlayVisible }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <PhotoBackdrop :image="photoImage" :repeat="photoRepeat" :text-color="scrimInk" :blur="photoBlur" />

    <div class="l3-topbar">
      <div class="l3-hijri" v-if="showHijri">{{ hijriDate }}</div>
      <div class="l3-clock" :class="{ 'with-seconds': showSeconds }">
        <span class="l3-clock-num">{{ clockNum }}</span>
        <span v-if="clockPeriod" class="l3-clock-period">{{ clockPeriod }}</span>
      </div>
      <div class="l3-gregorian">{{ gregorianDate }}</div>
    </div>
    <div class="l3-body">

      <!-- Left: next prayer focus -->
      <div class="l3-left">
        <div class="l3-next-label">{{ T.next }}</div>
        <div class="l3-next-name" :class="{ 'is-jumuah': currentPrayer?.isJumuah }">{{ currentPrayer?.name }}</div>
        <div class="l3-next-speaker" v-if="currentPrayer?.speaker">
          <span class="l3-speaker-label">{{ T.khateeb }}</span>
          <span class="l3-speaker-name">{{ currentPrayer.speaker }}</span>
        </div>
        <div class="l3-ornament">◆</div>
        <div class="l3-times">
          <div class="l3-time-block">
            <div class="l3-time-label">{{ T.adhan }}</div>
            <div class="l3-time-val">{{ currentPrayer?.adhan }}</div>
          </div>
          <div class="l3-times-sep"></div>
          <div class="l3-time-block">
            <div class="l3-time-label">{{ T.iqamah }}</div>
            <div class="l3-time-val l3-gold">{{ currentPrayer?.iqamah }}</div>
          </div>
        </div>
        <div class="l3-countdown-wrap">
          <span class="l3-countdown-in">{{ sidebarCountdown.label }}</span>
          <span class="l3-countdown">{{ sidebarCountdown.text }}</span>
        </div>
      </div>

      <div class="l3-vsep"></div>

      <!-- Right: full schedule table -->
      <div class="l3-right">
        <img v-if="mosqueLogoSrc" class="l3-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />
        <div class="l3-thead">
          <span class="l3-col-name"></span>
          <span class="l3-col-time">{{ T.adhan }}</span>
          <span class="l3-col-time">{{ T.iqamah }}</span>
        </div>
        <div
          v-for="p in prayers"
          :key="p.rowKey"
          class="l3-row"
          :class="{ active: nextPrayerKey === p.key && (!p.isJumuah || p.activeJumuah) }"
        >
          <div class="l3-row-inner">
            <span class="l3-col-name" :class="{ 'l3-jumuah-name': p.isJumuah }">{{ p.name }}</span>
            <span class="l3-col-time">{{ p.adhan }}</span>
            <span class="l3-col-time l3-gold">{{ p.iqamah }}</span>
          </div>
          <div v-if="p.speaker" class="l3-speaker-line">
            <span class="l3-speaker-label">{{ T.khateeb }}</span>
            <span class="l3-speaker-name">{{ p.speaker }}</span>
          </div>
          <div v-if="showSunrise && p.key === 'fajr' && sunriseTime" class="l3-sunrise-line">
            <span class="l3-col-name"></span>
            <span class="l3-sunrise-content">
              <span class="l3-sunrise-name">{{ T.sunrise }}</span>
              <span class="l3-sunrise-time">{{ sunriseTime }}</span>
            </span>
          </div>
        </div>
      </div>

    </div>
    <div class="l3-mosque-corner" v-if="showMosque && props.mosqueName">📍 {{ props.mosqueName }}</div>

    <!-- The shared focus screen: alternates every 30 s, holds all night pinned to
         Fajr, and swaps to the adhan takeover while the adhan plays. -->
    <FocusScreen
      v-bind="focusProps"
      :active="focusVisible"
      :prayer="focusPrayer"
      :countdown="countdown"
      :pill-target="pillTarget"
      :adhan-passed="adhanPassed"
    />
    <FocusScreen
      v-bind="focusProps"
      mode="athan"
      :active="athanScreenActive"
      :prayer="currentPrayer"
      :athan-countdown="iqamahCountdown"
      :is-athan-muted="isAthanMuted"
      @toggle-athan-mute="emit('toggle-athan-mute')"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import PhotoBackdrop from './PhotoBackdrop.vue'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime } from '../utils/prayerTime.js'
import { toRgba } from '../utils/colorAdjust.js'
import { clampCqi } from '../utils/cssUnits'
import { boardPhase, resetRotation, restartRotationDwell } from '../utils/viewRotation.js'

const props = defineProps({
  // Focus-screen scrim: its color and how far it covers the board. Dark mode keeps
  // its own night palette regardless — see the .l3-overlay-dark rules.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.88' },
  // 'on' carries the board's background photo onto the focus screen, under the scrim.
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000 instead of the deep slate, so an OLED
  // panel emits nothing at all from the background. Also togglable from the bedside bar.
  focusOled:    { type: String, default: 'off' },
  // Focus-screen brightness, 0.3–1. Dims the content, never the ground, so OLED black stays black.
  focusDimDefault: { type: [Number, String], default: 1 },
  // Optional background photo — see PhotoBackdrop.vue. '' keeps the color background.
  photoImage:   { type: String, default: '' },
  photoRepeat:  { type: [Boolean, String], default: false },
  prayerData:    Object,
  nextPrayerKey: String,
  mosqueName:    String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // Always today's slice. The night focus starts from *today's* Isha iqamah even once
  // the rest of the screen has rolled over to tomorrow's times.
  todayPrayerData: Object,
  baseDate:      { type: Date, default: () => new Date() },
  // 'en' | 'ar'
  lang:          { type: String, default: 'en' },
  // Minutes after Isha iqamah before the all-night Fajr focus takes over; 'off' disables it.
  nightFocusAfterIshaMin: { type: String, default: '20' },
  // Adhan playback state, for the takeover countdown screen and its mute button.
  isAthanPlaying: { type: Boolean, default: false },
  isAthanMuted:   { type: Boolean, default: false },
  // Native-configurable colors (Android toolbar). Reactive → live updates.
  textColor:    { type: String, default: '#543D24' },
  accentColor:  { type: String, default: '#C2A67F' },
  bgColor:      { type: String, default: '#FFFDF9' },
  surfaceColor: { type: String, default: '#FBF5E8' },
  // Font-size scale factors for the adhan / iqamah times (1 = default).
  adhanScale:  { type: String, default: '1' },
  iqamahScale: { type: String, default: '1' },
  // Seconds between focus-view toggles. 0 (or less) disables it entirely.
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
  // 'analog' puts an Apple-style dial on the leading edge of the focus screen;
  // 'digital' keeps the corner readout.
  focusClock:       { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting.
  countdownFor:     { type: String, default: 'athan' },
})

// The top bar and the left panel cover most of the board, so they thin out to a
// tint of their surface color once a background photo is set — otherwise the photo
// would only show in the schedule column.
const hasPhoto = computed(() => !!String(props.photoImage || '').trim())
const panelBg = computed(() =>
  hasPhoto.value ? toRgba(props.surfaceColor, 0.58) : props.surfaceColor
)
// The schedule column paints nothing of its own, so with a photo it was the one region
// showing the bare image - a window cut into the board rather than a background behind it.
// A lighter wash than the panels keeps the two readable as separate areas.
const scheduleBg = computed(() =>
  hasPhoto.value ? toRgba(props.surfaceColor, 0.34) : 'transparent'
)
// Dark mode hard-codes its own panel colors, which overrode the tints above and left the
// photo visible *only* in the schedule column. These keep the night palette but let the
// photo through at the same strength.
const darkTopbarBg = computed(() =>
  hasPhoto.value ? 'rgba(22, 28, 38, 0.52)' : '#161C26'
)
const darkPanelBg = computed(() =>
  hasPhoto.value
    ? 'linear-gradient(160deg, rgba(22, 28, 38, 0.52) 0%, rgba(17, 23, 32, 0.52) 100%)'
    : 'linear-gradient(160deg, #161C26 0%, #111720 100%)'
)
const darkScheduleBg = computed(() =>
  hasPhoto.value ? 'rgba(13, 17, 23, 0.26)' : 'transparent'
)
/** PhotoBackdrop picks its scrim's polarity from the ink it is handed; at night the board's
 *  ink is the night palette's, not the configured light-mode one. Without this the dark
 *  board sat under a 62% *white* scrim and the photo glowed against the black panels. */
const scrimInk = computed(() => (props.darkMode ? '#E8E0D4' : props.textColor))
/** This board writes across its whole width, so a sharp photograph always ends up with
 *  an edge through a prayer time. Tiled patterns are flat by nature and stay sharp. */
const photoBlur = computed(() => {
  const tiled = props.photoRepeat === true || props.photoRepeat === 'true'
  return hasPhoto.value && !tiled ? '0.9vw' : ''
})

const emit = defineEmits(['toggle-athan-mute', 'stop-athan'])

const TEXT = {
  en: {
    next: 'NEXT PRAYER', adhan: 'Adhan', iqamah: 'Iqamah',
    adhanCaps: 'ADHAN', iqamahCaps: 'IQAMAH',
    sunrise: 'Sunrise', jumuah: "Jumu'ah", khateeb: 'Khateeb', khutbahStartsAt: 'KHUTBAH STARTS AT', iqamahIn: 'IQAMAH IN', mute: 'Mute adhan', unmute: 'Unmute adhan',
    adhanIn: 'ADHAN IN', khutbahIn: 'KHUTBAH IN',
    mosqueLogo: 'Mosque logo',
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
  },
  ar: {
    next: 'الصلاة القادمة', adhan: 'الأذان', iqamah: 'الإقامة',
    adhanCaps: 'الأذان', iqamahCaps: 'الإقامة',
    sunrise: 'الشروق', jumuah: 'الجمعة', khateeb: 'الخطيب', khutbahStartsAt: 'تبدأ الخطبة', iqamahIn: 'الإقامة بعد', mute: 'كتم الأذان', unmute: 'تشغيل الأذان',
    adhanIn: 'الأذان بعد', khutbahIn: 'الخطبة بعد',
    mosqueLogo: 'شعار المسجد',
    fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
  },
}

const ICON = {
  volumeUp: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
}

const lang = computed(() => (props.lang === 'ar' ? 'ar' : 'en'))
const dir  = computed(() => (lang.value === 'ar' ? 'rtl' : 'ltr'))
const T    = computed(() => TEXT[lang.value])
// Latin digits even in Arabic. Bare prayer times stay in en-US because stripAmPm()
// only removes a Latin AM/PM — an Arabic locale would leave a ص/م hanging off each one.
const localeTag = computed(() => (lang.value === 'ar' ? 'ar-u-nu-latn' : 'en-US'))

// Soft accent wash used for the active-row background, derived from accentColor.
function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(f, 16)
  return Number.isNaN(n) ? { r: 194, g: 166, b: 127 } : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const accentSoft = computed(() => {
  const { r, g, b } = hexToRgb(props.accentColor)
  return `rgba(${r}, ${g}, ${b}, 0.18)`
})

const now = ref(debugNow())
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
const clockParts = computed(() => formatClock(now.value, {
  hour12: hour12.value,
  seconds: props.showSeconds,
  hour: '2-digit',
  split: true,
  locale: localeTag.value,
}))
const clockNum = computed(() => clockParts.value.num ?? formatClock(now.value, {
  hour12: hour12.value,
  seconds: props.showSeconds,
  hour: '2-digit',
  locale: localeTag.value,
}))
const clockPeriod = computed(() => clockParts.value.period ?? '')

// ── Friday Jumu'ah ──────────────────────────────────────────────────────────
// Mosques in the scraper feed get their Dhuhr row replaced by one row per Jumu'ah
// session, each with its khateeb when the feed names one. Everyone else — and any
// Friday the feed is empty or unreachable — keeps the plain Dhuhr row.
const isFriday = computed(() => now.value.getDay() === 5)
const jumuahSessions = computed(() => (isFriday.value ? props.jumuahPrayers : []))

/** The session still ahead (the last one once they have all passed). */
const activeJumuahIndex = computed(() => {
  const list = jumuahSessions.value
  if (!list.length) return -1
  const i = list.findIndex(j => getPrayerDateTime(j.time, false, true, now.value) >= now.value)
  return i === -1 ? list.length - 1 : i
})

const prayers = computed(() => {
  if (!props.prayerData) return PRAYERS.map(p => ({ ...p, rowKey: p.key, name: T.value[p.key], adhan: '--:--', iqamah: '--:--' }))
  return PRAYERS.flatMap(p => {
    const adhan  = displayTime(getPrayerDateTime(props.prayerData[p.azaanKey],  p.isFajr, p.isDhuhr))
    const iqamah = displayTime(getPrayerDateTime(props.prayerData[p.iqamahKey], p.isFajr, p.isDhuhr))

    if (p.isDhuhr && jumuahSessions.value.length) {
      return jumuahSessions.value.map((j, i) => ({
        ...p,
        rowKey:       `jumuah-${i}`,
        name:         j.label || T.value.jumuah || "Jumu'ah",
        adhan,
        iqamah:       displayTime(getPrayerDateTime(j.time, false, true, now.value)),
        speaker:      j.speaker || '',
        isJumuah:     true,
        activeJumuah: i === activeJumuahIndex.value,
      }))
    }
    return [{ ...p, rowKey: p.key, name: T.value[p.key], adhan, iqamah }]
  })
})

/** MCC East Bay runs four Jumu'ah sessions: past five rows the table has to give
 *  some height back or Isha falls off the bottom edge. */
const rowFit = computed(() => {
  const n = prayers.value.length + (props.showSunrise && sunriseTime.value ? 1 : 0)
         + prayers.value.filter(p => p.speaker).length
  if (n <= 6) return 1
  return Math.max(0.6, 1 - (n - 6) * 0.09)
})

const gregorianDate = computed(() =>
  now.value.toLocaleDateString(localeTag.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
// Month names come from our own table: some WebViews lack Islamic month data and
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() =>
  formatHijriLocalized(now.value, props.hijriOffset, lang.value)
)
const currentPrayer = computed(() => {
  const matches = prayers.value.filter(p => p.key === props.nextPrayerKey)
  return matches.find(p => p.activeJumuah) || matches[0] || null
})

const sunriseTime = computed(() => {
  if (!props.prayerData?.sunrise) return null
  const d = getPrayerDateTime(props.prayerData.sunrise, true, false)
  return displayTime(d)
})

// ── Focus screen ────────────────────────────────────────────────────────────
// The screen itself, the night focus and the two-stage countdown are shared with
// every other layout — see FocusScreen.vue and utils/focusScreen.js. This layout
// decides only *when* the screen is up.
const {
  nightFocusActive, adhanPassed, pillTarget, countdown, awaitingIqamah,
  sidebar, iqamahCountdown,
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

// The adhan takeover beats the night focus, which beats the 30s alternation.
/** Set when a swipe dismisses the takeover, so it does not immediately return.
 *  Cleared when the adhan stops, ready for the next one. */
const athanDismissed = ref(false)
const athanScreenActive = computed(() => props.isAthanPlaying && !athanDismissed.value)
watch(() => props.isAthanPlaying, playing => { if (!playing) athanDismissed.value = false })

// A horizontal swipe parks the view on one side until the next tick (day) or the next
// swipe (night, where there is no alternation to hand it back).
const manualView = ref(null)     // null = automatic, true = focus, false = cards

const focusVisible = computed(() => {
  if (athanScreenActive.value) return false
  if (manualView.value !== null) return manualView.value
  // awaitingIqamah holds the screen from the adhan to the iqamah — see below.
  return nightFocusActive.value || awaitingIqamah.value || showFocus.value
})
/** Any full-screen overlay is up, so the cards underneath fade out. */
const overlayVisible = computed(() => athanScreenActive.value || focusVisible.value)
/** The focus/adhan screens use the dark palette all night, even if dark mode is off. */
const overlayDark = computed(() => props.darkMode || nightFocusActive.value)

/** Fajr all night; otherwise whatever is next. */
const focusPrayer = computed(() =>
  nightFocusActive.value
    ? (prayers.value.find(p => p.key === 'fajr') || currentPrayer.value)
    : currentPrayer.value
)

/** Everything the shared focus screen needs that is the same on both of its faces. */
const focusProps = computed(() => ({
  now:             now.value,
  lang:            lang.value,
  overlayDark:     overlayDark.value,
  focusBg:         props.focusBg,
  focusOpacity:    props.focusOpacity,
  focusPhoto:      props.focusPhoto,
  photoImage:      props.photoImage,
  focusOled:       props.focusOled,
  focusDimDefault: props.focusDimDefault,
  focusClock:      props.focusClock,
  adhanScale:      props.adhanScale,
  iqamahScale:     props.iqamahScale,
  timeFormat:      props.timeFormat,
  hijriOffset:     props.hijriOffset,
  showSeconds:     props.showSeconds,
  showHijri:       props.showHijri,
}))

/** The sidebar countdown on the main view. "Remaining" said nothing about *what*
 *  was remaining, so it names its target and switches with it: the adhan until it is
 *  called, then the iqamah. Unlike the focus pill this ignores Countdown For — the
 *  sidebar is a permanent fixture of the board and must never go blank. */
const SIDEBAR_LABEL = { adhan: 'adhanIn', iqamah: 'iqamahIn', khutbah: 'khutbahIn' }
const sidebarCountdown = computed(() => ({
  label: T.value[SIDEBAR_LABEL[sidebar.value.target]],
  text:  sidebar.value.text,
}))

/** One alternation tick, from the board's shared rotation clock — the same clock the
 *  events and Jumu'ah slides take their slot from, so this view always gets its whole
 *  dwell before one of them comes up. A manual swipe is handed back to the clock
 *  during the day; at night nothing alternates, so the swipe stands until the next one. */
function onFocusTick() {
  if (!nightFocusActive.value && !awaitingIqamah.value) manualView.value = null
  showFocus.value = boardPhase.value % 2 === 1
}
watch(boardPhase, onFocusTick)

/** @param resetView false keeps whatever view is showing and only restarts the clock. */
function restartFocusInterval(resetView = true) {
  if (resetView) {
    showFocus.value = false
    resetRotation()
  } else {
    restartRotationDwell(showFocus.value)
  }
}

// ── Swipe to switch views ───────────────────────────────────────────────────
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
  // A tap that goes nowhere belongs to the focus screen's bedside bar, which
  // handles it itself.
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && Date.now() - start.t < 500) return
  // Horizontal intent only, so a stray vertical drag doesn't flip the view.
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (athanScreenActive.value) {
    athanDismissed.value = true
    emit('stop-athan')
    return
  }
  toggleView()
}

// Hand control back to the automatic behaviour when the context changes under it.
watch(nightFocusActive, () => { manualView.value = null })
watch(awaitingIqamah, () => { manualView.value = null })
watch(athanScreenActive, () => { manualView.value = null })

onMounted(() => {
  clockInterval = setInterval(() => { now.value = debugNow() }, 1000)
  restartFocusInterval()
})
// Debug toolbar: follow its time travel, and its view swap.
useDebugClock(() => { now.value = debugNow() }, toggleView)
// Re-arm (or stop) the focus toggle when the native control changes it.
// Wrapped: watch() would pass the new interval in as restartFocusInterval's resetView flag.
watch(() => props.focusIntervalSec, () => restartFocusInterval())
onUnmounted(() => clearInterval(clockInterval))
</script>

<style scoped>
* { box-sizing: border-box; }

.l3-root {
  position: fixed;
  inset: 0;
  background: v-bind(bgColor);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: v-bind(textColor);
  isolation: isolate;
  touch-action: none;
}
.l3-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}
.l3-topbar,
.l3-body,
.l3-mosque-corner {
  position: relative;
  z-index: 1;
}

/* ── Top bar ─────────────────────────────────── */
.l3-mosque-corner {
  position: absolute;
  bottom: 10px;
  right: clamp(20px, 2.5vw, 40px);
  font-size: clamp(16px, 1.5vw, 22px);
  font-weight: 500;
  color: v-bind(accentColor);
  pointer-events: none;
}

.l3-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(10px, 1.8vh, 22px) clamp(42px, 5.25vw, 84px);
  border-bottom: 2px solid #E6DEC9;
  flex-shrink: 0;
  background: v-bind(panelBg);
}

.l3-hijri {
  font-family: 'Inter', sans-serif;
  font-size: clamp(22px, 3.5vh, 48px);
  font-weight: 700;
  color: v-bind(textColor);
}

.l3-clock {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: baseline;
  column-gap: 0.35em;
  font-family: 'Inter', sans-serif;
  font-size: clamp(22px, 3.5vh, 48px);
  font-weight: 700;
  color: v-bind(textColor);
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.l3-clock-num {
  display: inline-block;
  width: 5ch;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.l3-clock.with-seconds .l3-clock-num {
  width: 8ch;
}
.l3-clock-period {
  display: inline-block;
  min-width: 2ch;
  text-align: left;
}

.l3-gregorian {
  font-size: clamp(22px, 3.5vh, 48px);
  font-weight: 700;
  color: v-bind(textColor);
}

/* ── Body ────────────────────────────────────── */
.l3-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* ── Left panel ──────────────────────────────── */
.l3-left {
  width: 36%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 3vh, 40px) clamp(20px, 3vw, 40px);
  background: v-bind(panelBg);
  gap: clamp(8px, 1.2vh, 18px);
}

.l3-next-label {
  font-size: clamp(20px, 2vw, 24px);
  text-transform: uppercase;
  letter-spacing: 4px;
  color: v-bind(accentColor);
  font-weight: 700;
}

.l3-next-name {
  font-family: 'Inter', sans-serif;
  font-size: clamp(36px, 6.75vw, 87px);
  font-weight: 700;
  color: v-bind(textColor);
  line-height: 1;
  text-align: center;
}
.l3-next-name.is-jumuah { font-size: calc(clamp(36px, 6.75vw, 87px) * 0.55); line-height: 1.1; }

.l3-ornament {
  font-size: clamp(16px, 2vh, 24px);
  color: v-bind(accentColor);
  line-height: 1;
}

.l3-times {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 2vh, 24px);
  width: 100%;
}

.l3-time-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.l3-time-label {
  font-size: clamp(22px, 2.2vw, 28px);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: v-bind(accentColor);
  font-weight: 600;
}

.l3-time-val {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(48px, 8.05vw, 103px) * v-bind(adhanScale));
  font-weight: 800;
  color: v-bind(textColor);
  line-height: 1;
}
.l3-time-val.l3-gold { font-size: calc(clamp(48px, 8.05vw, 103px) * v-bind(iqamahScale)); }

.l3-times-sep {
  width: 40%;
  height: 1px;
  background: #D8CEBC;
}

.l3-gold { color: v-bind(accentColor); }

.l3-countdown-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: clamp(8px, 1.5vh, 18px);
}

.l3-countdown-in {
  font-size: clamp(22px, 2.2vw, 28px);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: v-bind(textColor);
}

.l3-countdown {
  display: inline-block;
  width: 8ch;
  font-family: 'Inter', sans-serif;
  font-size: clamp(36px, 5.5vw, 70px);
  font-weight: 800;
  color: v-bind(textColor);
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* ── Vertical separator ──────────────────────── */
.l3-vsep {
  width: 2px;
  background: #E6DEC9;
  flex-shrink: 0;
}

/* ── Right panel (schedule table) ────────────── */
.l3-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(20px, 3vh, 40px) clamp(28px, 3.5vw, 56px);
  background: v-bind(scheduleBg);
  gap: 0;
}

.l3-thead {
  display: flex;
  align-items: center;
  padding: 0 clamp(16px, 2vw, 28px) clamp(8px, 1vh, 14px);
  border-bottom: 2px solid v-bind(accentColor);
  margin-bottom: 2px;
}

.l3-mosque-logo {
  align-self: center;
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
  margin-bottom: clamp(10px, 1.4vh, 18px);
}

.l3-thead span {
  font-size: clamp(22px, 2.2vw, 28px);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: v-bind(accentColor);
  font-weight: 700;
}

.l3-col-name  { flex: 2; }
.l3-col-time  { flex: 1.2; text-align: center; }

.l3-row {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #EDE6D8;
  transition: background 0.3s;
}

.l3-row-inner {
  display: flex;
  align-items: center;
  padding: calc(clamp(10px, 1.6vh, 20px) * v-bind(rowFit)) clamp(16px, 2vw, 28px);
}

.l3-row.active {
  background: v-bind(accentSoft);
  border-left: 4px solid v-bind(accentColor);
  border-radius: 0 8px 8px 0;
}

.l3-row .l3-col-name {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(26px, 4.2vh, 54px) * v-bind(rowFit));
  font-weight: 700;
  color: v-bind(textColor);
  display: flex;
  align-items: center;
  gap: 10px;
}

.l3-row.active .l3-col-name {
  color: v-bind(textColor);
}

.l3-row .l3-col-time {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(34px, 5.8vh, 74px) * v-bind(adhanScale) * v-bind(rowFit));
  font-weight: 700;
  color: v-bind(textColor);
  text-align: center;
}
.l3-row .l3-col-time.l3-gold { font-size: calc(clamp(34px, 5.8vh, 74px) * v-bind(iqamahScale) * v-bind(rowFit)); }

.l3-row-arrow {
  color: v-bind(accentColor);
  font-size: clamp(14px, 2vh, 26px);
}

/* Jumu'ah labels carry a venue ("Jummah 2 - Rosewood Center"), so they get a
   smaller face and are allowed to wrap rather than shoving the times off-row. */
.l3-row .l3-col-name.l3-jumuah-name {
  font-size: calc(clamp(20px, 3.1vh, 40px) * v-bind(rowFit));
  line-height: 1.15;
  display: block;
}

.l3-speaker-line {
  display: flex;
  align-items: baseline;
  gap: clamp(8px, 1vw, 14px);
  padding: 0 clamp(16px, 2vw, 28px) calc(clamp(8px, 1.2vh, 16px) * v-bind(rowFit));
}

.l3-speaker-label {
  font-family: 'Inter', sans-serif;
  font-size: clamp(18px, 1.9vw, 24px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: v-bind(accentColor);
  opacity: 0.85;
}

.l3-speaker-name {
  font-family: 'Inter', sans-serif;
  font-size: clamp(17px, 2.4vh, 32px);
  font-weight: 600;
  color: v-bind(textColor);
  opacity: 0.9;
}

.l3-next-speaker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: clamp(4px, 0.8vh, 10px);
}

.l3-dark .l3-speaker-name { color: #E8EEF8; }

/* ── Focus overlay ───────────────────────────── */
/* The screen itself is FocusScreen.vue; the board underneath just steps back. */
.l3-root.l3-faded > *:not(.fs-root) {
  opacity: 0;
  transition: opacity 0.8s ease;
}

/* ── Dark mode (Maghrib Iqamah → Fajr Adhan) ─── */
.l3-dark {
  background: #0D1117;
  color: #E8E0D4;
}

.l3-dark .l3-topbar {
  background: v-bind(darkTopbarBg);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.l3-dark .l3-hijri,
.l3-dark .l3-clock,
.l3-dark .l3-gregorian {
  color: #E8E0D4;
}

.l3-dark .l3-left {
  background: v-bind(darkPanelBg);
}

.l3-dark .l3-right {
  background: v-bind(darkScheduleBg);
}

.l3-dark .l3-next-label,
.l3-dark .l3-time-label {
  color: #7A9CC7;
}

.l3-dark .l3-next-name,
.l3-dark .l3-time-val {
  color: #E8E0D4;
}

.l3-dark .l3-ornament {
  color: #4A6FA5;
}

.l3-dark .l3-times-sep {
  background: rgba(255, 255, 255, 0.1);
}

.l3-dark .l3-gold { color: #F0C060; }

.l3-dark .l3-countdown-in { color: #7A9CC7; }
.l3-dark .l3-countdown     { color: #E8E0D4; }

.l3-dark .l3-vsep {
  background: rgba(255, 255, 255, 0.08);
}

.l3-dark .l3-thead span {
  color: #7A9CC7;
}

.l3-dark .l3-thead {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.l3-dark .l3-row {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.l3-dark .l3-row .l3-col-name,
.l3-dark .l3-row .l3-col-time {
  color: #E8E0D4;
}

.l3-dark .l3-row.active {
  background: rgba(100, 140, 220, 0.15);
  border-left-color: #7EB3FF;
}

.l3-dark .l3-row.active .l3-col-name {
  color: #ffffff;
}

.l3-dark .l3-mosque-corner {
  color: #7A9CC7;
}

/* ── Sunrise sub-line (inside Fajr row) ──────── */
.l3-sunrise-line {
  display: flex;
  align-items: center;
  padding: 0 clamp(16px, 2vw, 28px) clamp(8px, 1.2vh, 14px);
}

.l3-sunrise-content {
  flex: 2.4; /* spans adhan + iqamah columns (2 × flex 1.2) */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.5vw, 20px);
}

.l3-sunrise-name {
  font-size: clamp(22px, 2.4vw, 34px);
  color: v-bind(accentColor);
  font-weight: 600;
}

.l3-sunrise-time {
  font-size: clamp(20px, 3.4vh, 44px);
  color: v-bind(accentColor);
  font-weight: 700;
}

.l3-dark .l3-sunrise-name { color: #A8B8D0; }
.l3-dark .l3-sunrise-time { color: #FFB940; }
/* ── Arabic ──────────────────────────────────────────────────────────────────
   Arabic is cursive: the tracked-out Latin labels would pull the joined letterforms
   apart, so letter-spacing is dropped wherever the script is RTL. */
[dir='rtl'] .l3-next-label,
[dir='rtl'] .l3-time-label,
[dir='rtl'] .l3-col-time,
[dir='rtl'] .l3-countdown-in,
[dir='rtl'] .l3-next-name {
  letter-spacing: 0;
}
/* Times and countdowns are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .l3-countdown,
[dir='rtl'] .l3-time-val,
[dir='rtl'] .l3-col-time,
[dir='rtl'] .l3-sunrise-time {
  direction: ltr;
  unicode-bidi: isolate;
}
/* The clocks carry an ص/م marker, which belongs to the LEFT of the digits in Arabic.
   Only the numerals are isolated LTR; the container stays RTL so the marker lands there. */
[dir='rtl'] .l3-clock-num { direction: ltr; unicode-bidi: isolate; }
</style>
