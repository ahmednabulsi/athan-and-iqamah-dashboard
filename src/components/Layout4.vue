<template>
  <div
    class="l4-root"
    :dir="dir"
    :class="{ 'l4-faded': focusVisible, 'is-dark': darkMode }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <PhotoBackdrop :image="photoImage" :repeat="photoRepeat" :text-color="scrimInk" :blur="photoBlur" />

    <!-- Header bar -->
    <div class="l4-top">
      <div class="l4-logo-slot">
        <img v-if="mosqueLogoSrc" class="l4-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />
        <div v-else-if="showHijri" class="l4-hijri">{{ hijriDate }}</div>
      </div>
      <div class="l4-top-main">
        <div class="l4-header">
          <div class="l4-clock">{{ clock }}</div>
          <div class="l4-date-stack">
            <div class="l4-gregorian">{{ gregorianDate }}</div>
            <div class="l4-hijri l4-hijri-stacked" v-if="mosqueLogoSrc && showHijri">{{ hijriDate }}</div>
          </div>
        </div>
        <div class="l4-mosque-bar" v-if="showMosque && props.mosqueName">📍 {{ props.mosqueName }}</div>
      </div>
    </div>

    <div class="l4-divider"></div>

    <!-- Hero: next prayer. The card is a separate element from the flex spacer so it
         hugs its own content instead of filling the board when a photo is set. -->
    <div class="l4-hero" :class="{ 'has-jumuah': jumuahSessions.length, 'has-weather': weatherCard && !jumuahSessions.length }">
      <div class="l4-hero-card">
        <div class="l4-hero-label">{{ T.next }}</div>
        <div class="l4-hero-name" :class="{ 'is-jumuah': currentPrayer?.isJumuah }">{{ currentPrayer?.name }}</div>
        <div class="l4-hero-times" :class="{ 'is-wide': heroTimesWide }">
          <div class="l4-htime">
            <div class="l4-htime-label">{{ T.adhan }}</div>
            <div class="l4-htime-val">{{ currentPrayer?.adhan }}</div>
          </div>
          <div class="l4-hero-vsep"></div>
          <div class="l4-htime">
            <div class="l4-htime-label">{{ T.iqamah }}</div>
            <div class="l4-htime-val l4-gold">{{ currentPrayer?.iqamah }}</div>
          </div>
        </div>
        <div class="l4-countdown">
          <span class="l4-countdown-label">{{ countdownLabel }}</span>
          <span class="l4-countdown-num">{{ countdown.text }}</span>
        </div>
      </div>

      <!-- Today / tonight / tomorrow, in the band beside the hero card. Friday's
           sessions take the same band, so only one of them is ever up. -->
      <aside class="l4-weather" v-if="weatherCard && !jumuahSessions.length">
        <div class="l4-wx-now">
          <svg class="l4-wx-ico" :class="{ 'is-sun': weatherCard.now.isSun }" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.now.icon" /></svg>
          <div class="l4-wx-now-text">
            <div class="l4-wx-temp">{{ weatherCard.now.temp }}°</div>
            <div class="l4-wx-cond">{{ weatherCard.now.cond }}</div>
          </div>
        </div>
        <div class="l4-wx-range" v-if="weatherCard.today">
          {{ T.hi }} <span class="l4-wx-num">{{ weatherCard.today.high }}°</span> ·
              {{ T.lo }} <span class="l4-wx-num">{{ weatherCard.today.low }}°</span>
        </div>
        <div class="l4-wx-rows">
          <div class="l4-wx-row" v-if="weatherCard.tonight">
            <span class="l4-wx-when">{{ T.tonight }}</span>
            <svg class="l4-wx-rowico" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.tonight.icon" /></svg>
            <span class="l4-wx-rowtemp">{{ weatherCard.tonight.temp }}°</span>
          </div>
          <div class="l4-wx-row" v-if="weatherCard.tomorrow">
            <span class="l4-wx-when">{{ T.tomorrow }}</span>
            <svg class="l4-wx-rowico" :class="{ 'is-sun': weatherCard.tomorrow.isSun }" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.tomorrow.icon" /></svg>
            <span class="l4-wx-rowtemp">{{ weatherCard.tomorrow.high }}°<small>/{{ weatherCard.tomorrow.low }}°</small></span>
          </div>
        </div>
      </aside>

      <!-- Friday only: the sessions, in the space beside the hero card. -->
      <div class="l4-jumuah" v-if="jumuahSessions.length">
        <div class="l4-jumuah-title">{{ T.jumuah }}</div>
        <div
          v-for="s in jumuahSessions"
          :key="s.key"
          class="l4-jumuah-row"
          :class="{ active: s.isNext }"
        >
          <div class="l4-jumuah-name">{{ s.name }}</div>
          <div class="l4-jumuah-time l4-gold">{{ s.time }}</div>
          <div class="l4-jumuah-speaker" v-if="s.speaker">{{ s.speaker }}</div>
        </div>
      </div>
    </div>

    <div class="l4-divider"></div>

    <!-- Prayer tiles -->
    <div class="l4-tiles">
      <div
        v-for="p in tilePrayers"
        :key="p.key"
        class="l4-tile"
        :class="{ active: nextPrayerKey === p.key && (!p.isJumuah || p.isNextJumuah) }"
      >
        <div class="l4-tile-name">{{ p.name }}</div>
        <div class="l4-tile-line"></div>
        <div class="l4-tile-row">
          <span class="l4-tile-label">{{ T.adhan }}</span>
          <span class="l4-tile-time">{{ p.adhan }}</span>
        </div>
        <div class="l4-tile-row">
          <span class="l4-tile-label">{{ T.iqamah }}</span>
          <span class="l4-tile-time l4-gold">{{ p.iqamah }}</span>
        </div>
        <!-- Sunrise rides under Fajr, where it belongs: the end of its window. -->
        <div class="l4-tile-row l4-tile-sun" v-if="showSunrise && sunriseTime && p.key === 'fajr'">
          <span class="l4-tile-label">{{ T.sunrise }}</span>
          <span class="l4-tile-time">{{ sunriseTime }}</span>
        </div>
      </div>
    </div>

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
import { contrastRatio, hexToRgb, mixHex, readableOn, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'
import { useWeather, describeWeather } from '../utils/weather.js'

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
  textColor:    { type: String, default: '#EDE8DC' },
  accentColor:  { type: String, default: '#C2A67F' },
  bgColor:      { type: String, default: '#1A1208' },
  surfaceColor: { type: String, default: '#221508' },
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
  // ── Weather (only drawn once the mosque's lat/lng are known) ─────────────
  showWeather:  { type: Boolean, default: true },
  weatherUnit:  { type: String, default: 'f' },   // 'f' | 'c'
  lat:          { type: [Number, String], default: null },
  lng:          { type: [Number, String], default: null },
})

const { lang, dir, T, localeTag } = useLayoutLang(props, {
  en: { hi: 'H', lo: 'L', tonight: 'Tonight', tomorrow: 'Tomorrow' },
  ar: { hi: 'ع', lo: 'ص', tonight: 'الليلة', tomorrow: 'غداً' },
})

// ── Weather ─────────────────────────────────────────────────────────────────
const { data: weatherData } = useWeather({
  lat: () => props.lat, lng: () => props.lng,
  unit: () => props.weatherUnit, enabled: () => props.showWeather,
})
/** null until the first successful read, which is also what hides the whole block. */
const weatherCard = computed(() => {
  const w = weatherData.value
  if (!props.showWeather || !w) return null
  const night = now.value.getHours() >= 19 || now.value.getHours() < 6
  return {
    now:      { ...w.now, ...describeWeather(w.now.code, lang.value, night) },
    today:    w.today,
    tonight:  w.tonight  ? { ...w.tonight,  ...describeWeather(w.tonight.code, lang.value, true) } : null,
    tomorrow: w.tomorrow ? { ...w.tomorrow, ...describeWeather(w.tomorrow.code, lang.value, false) } : null,
  }
})

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
const accentSoft = computed(() => {
  const { r, g, b } = hexToRgb(resolvedAccent.value)
  return `rgba(${r}, ${g}, ${b}, ${props.darkMode ? 0.28 : 0.2})`
})
const resolvedTileBorder = computed(() =>
  props.darkMode
    ? mixHex(resolvedSurface.value, resolvedAccent.value, 0.25)
    : '#2E2010'
)
const resolvedHeroSep = computed(() =>
  props.darkMode
    ? mixHex(resolvedBg.value, resolvedAccent.value, 0.3)
    : '#4A3620'
)
const resolvedTileLine = computed(() =>
  props.darkMode
    ? mixHex(resolvedSurface.value, resolvedAccent.value, 0.28)
    : '#3A2810'
)
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

/** The five daily prayers — and the five tiles along the bottom. The row is sized for
 *  exactly these: a mosque with three or four Jumu'ah sessions would push seven or
 *  eight tiles into it and they would not fit, so the sessions get their own card
 *  beside the hero instead (see `jumuahSessions`). */
const tilePrayers = computed(() => {
  if (!props.prayerData) return PRAYERS.map(p => ({ ...p, name: T.value[p.key], adhan: '--:--', iqamah: '--:--' }))
  return PRAYERS.map(p => ({
    ...p,
    name:   T.value[p.key],
    adhan:  displayTime(getPrayerDateTime(props.prayerData[p.azaanKey],  p.isFajr, p.isDhuhr)),
    iqamah: displayTime(getPrayerDateTime(props.prayerData[p.iqamahKey], p.isFajr, p.isDhuhr)),
  }))
})

/** The same list with Friday's Dhuhr row expanded into one row per session. The hero
 *  and the focus screen read from this one: whatever the bottom row shows, the board's
 *  headline on a Friday has to be the session that is actually next. */
const prayers = computed(() =>
  withJumuahRows(tilePrayers.value, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:   `jumuah-${i}`,
    name:     jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:   displayTime(jumuahDate(s.time)),
    speaker:  s.speaker || '',
    isJumuah: true,
    isNextJumuah: isNext,
  }), now.value)
)

/** "15:25" is a third wider than "9:25": at this size a 24-hour pair runs to the
 *  card's edges, so it steps down. */
const isWideTime = t => String(t || '').replace(/\D/g, '').length >= 4
const heroTimesWide = computed(() =>
  isWideTime(currentPrayer.value?.adhan) || isWideTime(currentPrayer.value?.iqamah)
)

const sunriseTime = computed(() =>
  props.prayerData?.sunrise
    ? displayTime(getPrayerDateTime(props.prayerData.sunrise, true, false))
    : null
)

/** Friday's sessions for the card beside the hero. Empty on any other day, and for a
 *  mosque the scraper does not cover — the card simply isn't there. */
const jumuahSessions = computed(() => {
  const list = props.jumuahPrayers || []
  const nextIdx = nextJumuahIndex(list, now.value)
  return list.map((s, i) => ({
    key:     `jumuah-${i}`,
    name:    jumuahName(s, { lang: lang.value, index: i, count: list.length, label: T.value.jumuah }),
    time:    displayTime(jumuahDate(s.time)),
    speaker: s.speaker || '',
    isNext:  i === nextIdx,
  }))
})

const clock = computed(() =>
  formatClock(now.value, { hour12: hour12.value, seconds: props.showSeconds, locale: localeTag.value })
)
const gregorianDate = computed(() =>
  now.value.toLocaleDateString(localeTag.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(now.value, props.hijriOffset, lang.value))
const currentPrayer = computed(() => {
  // Friday maps the Dhuhr key onto several rows; follow the session still ahead.
  const matches = prayers.value.filter(p => p.key === props.nextPrayerKey)
  return matches.find(p => p.isNextJumuah) || matches[0] || null
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

const manualView = ref(null)     // null = automatic, true = focus, false = grid
const focusVisible = computed(() => {
  if (manualView.value !== null) return manualView.value
  // awaitingIqamah holds the screen from the adhan to the iqamah.
  return nightFocusActive.value || awaitingIqamah.value || showFocus.value
})
const overlayDark = computed(() => props.darkMode || nightFocusActive.value)

// ── Readability over a background photo ──────────────────────────────────────
const hasPhoto = computed(() => !!String(props.photoImage || '').trim())
/** PhotoBackdrop picks its scrim's polarity from the ink it is handed, and the board
 *  does not always write in the *configured* ink: at night it writes in the night
 *  palette's. Handing over the raw prop put a 62% **white** scrim under cream type —
 *  the hero read at about 1.1:1 on a photo board, which is what made this layout
 *  unreadable. `resolvedText` is what the board actually writes in, in either mode. */
const scrimInk = computed(() => resolvedText.value)
/** The hero writes straight across the board with no card under it, so a sharp
 *  photograph always ends up with an edge running through a prayer time. Tiled
 *  patterns are flat by nature and stay sharp. */
const photoBlur = computed(() => {
  const tiled = props.photoRepeat === true || props.photoRepeat === 'true'
  return hasPhoto.value && !tiled ? '0.9vw' : ''
})
/** With a photo set, the hero and the header take the tiles' own ground — thinned so
 *  the picture still reads through them. Without one they stay flat on the board, so
 *  the layout's usual look is untouched. */
const heroBg    = computed(() => (hasPhoto.value ? toRgba(resolvedSurface.value, 0.72) : 'transparent'))
/** The weather block is a widget, not part of the board's flow, so it keeps a visible
 *  hairline and a tinted panel in both modes — `heroEdge` goes transparent without a
 *  photo, which left it floating as bare text. */
const wxEdge = computed(() => toRgba(resolvedText.value, 0.22))
const wxBg   = computed(() => toRgba(resolvedSurface.value, hasPhoto.value ? 0.72 : 0.5))
const heroEdge  = computed(() => (hasPhoto.value ? resolvedTileBorder.value : 'transparent'))
const topBarBg  = computed(() => (hasPhoto.value ? toRgba(resolvedSurface.value, 0.62) : 'transparent'))
/** The accent is chosen to look right as a rule or a fill; as label text it can land
 *  near 2:1 on the ground it sits on, which reads as grey mush across a hall. Mixed
 *  toward the board's ink until it clears the large-text threshold, and left alone when
 *  it already does.
 *
 *  The accent labels sit on two different grounds — the hero (the panel tint with a
 *  photo, the board itself without one) and the tiles' surface. Resolve against
 *  whichever of the two the accent reads worst on, so one value is safe on both. */
const accentGround = computed(() => {
  const hero = hasPhoto.value ? resolvedSurface.value : resolvedBg.value
  const tile = resolvedSurface.value
  return contrastRatio(resolvedAccent.value, hero) <= contrastRatio(resolvedAccent.value, tile) ? hero : tile
})
const labelAccent = computed(() =>
  readableOn(resolvedAccent.value, accentGround.value, resolvedText.value, 4)
)

/** The hero countdown names what it is counting to and switches with it: the adhan
 *  until it is called, then the iqamah (a Friday Dhuhr counts to its khutbah). Unlike
 *  the focus pill this ignores Countdown For — the hero is the board's headline and
 *  must never go blank. */
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
// Re-arm (or stop) the focus toggle when the native control changes it.
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

.l4-root {
  position: fixed;
  inset: 0;
  background: v-bind(resolvedBg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: v-bind(resolvedText);
  isolation: isolate;
}
.l4-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}
/* The background photo stays at z-index -1: it must not be lifted above content. */
.l4-root > *:not(.fs-root):not(.photo-backdrop) {
  position: relative;
  z-index: 1;
}

/* ── Header ──────────────────────────────────── */
.l4-top {
  position: relative;
  padding: clamp(10px, 1.8vh, 22px) clamp(42px, 5.25vw, 84px) clamp(4px, 0.6vh, 8px);
  flex-shrink: 0;
  background: v-bind(topBarBg);
}

.l4-logo-slot {
  position: absolute;
  top: 0;
  bottom: 0;
  left: clamp(42px, 5.25vw, 84px);
  min-width: v-bind(mosqueLogoWidth);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  pointer-events: none;
}

.l4-top-main {
  width: 100%;
  min-width: 0;
}

.l4-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  flex-shrink: 0;
}

.l4-hijri {
  font-family: 'Inter', sans-serif;
  font-size: clamp(15px, min(1.6vw, 2.3vh), 24px);
  font-weight: 700;
  color: v-bind(labelAccent);
  white-space: nowrap;
}

.l4-mosque-logo {
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
  display: block;
}

.l4-clock {
  font-family: 'Inter', sans-serif;
  font-size: clamp(22px, 3.5vh, 48px);
  font-weight: 700;
  color: v-bind(resolvedText);
  letter-spacing: 2px;
  grid-column: 2;
  justify-self: center;
}

.l4-gregorian {
  font-size: clamp(15px, min(1.55vw, 2.2vh), 24px);
  color: v-bind(labelAccent);
  font-weight: 500;
}

.l4-date-stack {
  grid-column: 3;
  justify-self: end;
  min-width: clamp(170px, 18vw, 320px);
  text-align: right;
}

.l4-hijri-stacked {
  margin-top: 4px;
}

/* ── Divider ─────────────────────────────────── */
.l4-mosque-bar {
  text-align: center;
  font-size: clamp(14px, min(1.4vw, 2vh), 22px);
  font-weight: 500;
  color: v-bind(labelAccent);
  padding-top: clamp(4px, 0.6vh, 8px);
  flex-shrink: 0;
}

.l4-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, v-bind(resolvedAccent) 20%, v-bind(resolvedAccent) 80%, transparent);
  flex-shrink: 0;
  margin: 0 clamp(28px, 3.5vw, 56px);
}

/* ── Hero ────────────────────────────────────── */
.l4-hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(12px, 2vh, 28px);
}
/* Friday reserves a band on both sides — wider than the sessions card itself — so the
   hero card stays centred on the board and can never run into it. */
.l4-hero.has-jumuah {
  padding-left: min(26vw, 340px);
  padding-right: min(26vw, 340px);
}
/* With the widget up the hero does not stay centred on the board: it steps away from
   it — left in English, right in Arabic — so the two read as two blocks side by side
   rather than one crowding the other. */
.l4-hero.has-weather {
  padding-left: clamp(12px, 2vh, 28px);
  padding-right: min(30vw, 400px);
}
[dir='rtl'] .l4-hero.has-weather {
  padding-left: min(30vw, 400px);
  padding-right: clamp(12px, 2vh, 28px);
}

/* ── Weather ─────────────────────────────────────
   Parked in the band beside the hero card, like Friday's sessions, so the card itself
   stays centred on the board whether or not the block is up. */
.l4-weather {
  position: absolute;
  right: clamp(16px, 2.4vw, 44px);
  top: 50%;
  transform: translateY(-50%);
  width: min(24vw, 310px);
  padding: clamp(12px, 1.8vh, 26px) clamp(14px, 1.7vw, 30px);
  border: 1px solid v-bind(wxEdge);
  border-radius: clamp(16px, 1.7vw, 28px);
  background: v-bind(wxBg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  color: v-bind(resolvedText);
}
[dir='rtl'] .l4-weather { right: auto; left: clamp(16px, 2.4vw, 44px); }

.l4-wx-now {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 16px);
}
.l4-wx-ico {
  width: clamp(38px, 4.4vw, 76px);
  height: clamp(38px, 4.4vw, 76px);
  flex: none;
  fill: v-bind(resolvedText);
  opacity: 0.9;
}
/* Only a clear sky takes the accent; a gold raindrop reads as wrong. */
.l4-wx-ico.is-sun,
.l4-wx-rowico.is-sun { fill: v-bind(labelAccent); opacity: 1; }
.l4-wx-temp {
  font-family: 'Inter', sans-serif;
  font-size: clamp(30px, 3.6vw, 62px);
  font-weight: 700;
  line-height: 1;
}
.l4-wx-cond {
  font-size: clamp(12px, min(1.15vw, 1.8vh), 19px);
  text-transform: uppercase;
  letter-spacing: 2px;
  color: v-bind(labelAccent);
  margin-top: clamp(2px, 0.4vh, 6px);
}
.l4-wx-range {
  font-size: clamp(12px, min(1.2vw, 1.9vh), 20px);
  font-weight: 600;
  opacity: 0.78;
  margin-top: clamp(4px, 0.7vh, 10px);
  font-variant-numeric: tabular-nums;
}
.l4-wx-rows {
  margin-top: clamp(8px, 1.2vh, 16px);
  padding-top: clamp(6px, 1vh, 12px);
  border-top: 1px solid v-bind(resolvedTileBorder);
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7vh, 10px);
}
.l4-wx-row {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.8vw, 12px);
}
.l4-wx-when {
  flex: 1;
  font-size: clamp(11px, min(1.05vw, 1.7vh), 17px);
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.72;
}
.l4-wx-rowico {
  width: clamp(18px, 1.9vw, 32px);
  height: clamp(18px, 1.9vw, 32px);
  flex: none;
  fill: v-bind(resolvedText);
  opacity: 0.85;
}
.l4-wx-rowtemp {
  font-family: 'Inter', sans-serif;
  font-size: clamp(16px, 1.7vw, 30px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.l4-wx-num { direction: ltr; unicode-bidi: isolate; }
.l4-wx-rowtemp small { font-size: 0.72em; font-weight: 500; opacity: 0.6; }

/* ── Friday sessions ─────────────────────────────
   Parked in the empty band beside the hero card rather than in the flex flow, so the
   card itself stays centred on the board whether or not it is Friday. */
.l4-jumuah {
  position: absolute;
  right: clamp(16px, 2.4vw, 44px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.9vh, 14px);
  max-width: min(24vw, 310px);
  padding: clamp(10px, 1.4vh, 20px) clamp(12px, 1.4vw, 24px);
  border: 1px solid v-bind(heroEdge);
  border-radius: 14px;
  background: v-bind(heroBg);
  text-align: center;
}
.l4-jumuah-title {
  font-size: clamp(14px, min(1.5vw, 2.1vh), 22px);
  text-transform: uppercase;
  letter-spacing: 4px;
  font-weight: 700;
  color: v-bind(labelAccent);
}
.l4-jumuah-row {
  padding: clamp(4px, 0.6vh, 10px) clamp(6px, 0.8vw, 14px);
  border-radius: 8px;
}
.l4-jumuah-row.active {
  background: v-bind(accentSoft);
}
.l4-jumuah-name {
  font-size: clamp(13px, min(1.25vw, 1.9vh), 20px);
  font-weight: 600;
  color: v-bind(resolvedText);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.l4-jumuah-time {
  font-family: 'Inter', sans-serif;
  font-size: clamp(22px, min(2.4vw, 3.6vh), 44px);
  font-weight: 700;
  line-height: 1.1;
}
.l4-jumuah-speaker {
  font-size: clamp(11px, min(1.05vw, 1.6vh), 17px);
  color: v-bind(resolvedText);
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.l4-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 1vh, 20px);
  padding: clamp(10px, 1.6vh, 30px) clamp(32px, 5vw, 90px);
  /* Always a 1px edge, transparent without a photo, so nothing shifts when one is set. */
  border: 1px solid v-bind(heroEdge);
  border-radius: 14px;
  background: v-bind(heroBg);
}

.l4-hero-label {
  font-size: clamp(16px, min(1.7vw, 2.4vh), 24px);
  text-transform: uppercase;
  letter-spacing: 5px;
  color: v-bind(labelAccent);
  font-weight: 700;
}

.l4-hero-name {
  font-family: 'Inter', sans-serif;
  font-size: clamp(42px, 7vw, 96px);
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
  letter-spacing: 3px;
}
/* A session carries its venue in its name — "Jummah 2 - Rosewood Center" — which is
   four times the length of "Dhuhr". The focus screen already does this. */
.l4-hero-name.is-jumuah {
  font-size: calc(clamp(42px, 7vw, 96px) * 0.58);
  line-height: 1.1;
  letter-spacing: 1px;
}

.l4-hero-times {
  display: flex;
  align-items: center;
  gap: clamp(24px, 4vw, 60px);
  margin-top: clamp(4px, 0.8vh, 12px);
}

.l4-htime {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.l4-htime-label {
  font-size: clamp(16px, min(1.7vw, 2.4vh), 24px);
  text-transform: uppercase;
  letter-spacing: 3px;
  color: v-bind(labelAccent);
}

.l4-htime-val {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(48px, 8.6vw, 150px) * v-bind(adhanScale));
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
}
.l4-htime-val.l4-gold { font-size: calc(clamp(48px, 8.6vw, 150px) * v-bind(iqamahScale)); }
/* Four digits either side ("15:25" twice) would run into the card's edges. */
.l4-hero-times.is-wide .l4-htime-val      { font-size: calc(clamp(48px, 8.6vw, 150px) * v-bind(adhanScale) * 0.76); }
.l4-hero-times.is-wide .l4-htime-val.l4-gold { font-size: calc(clamp(48px, 8.6vw, 150px) * v-bind(iqamahScale) * 0.76); }

.l4-hero-vsep {
  width: 1px;
  height: clamp(60px, 11vh, 150px);
  background: v-bind(resolvedHeroSep);
}

.l4-gold { color: v-bind(labelAccent); }

.l4-countdown-label {
  font-size: 0.55em;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0.85;
}
.l4-countdown-num { display: inline-block; width: 9ch; text-align: start; }

/* Sunrise sits under Fajr as a quieter row — it is the end of a window, not a prayer. */
.l4-tile-sun {
  opacity: 0.72;
  border-top: 1px solid v-bind(resolvedTileBorder);
  margin-top: clamp(2px, 0.4vh, 6px);
  padding-top: clamp(2px, 0.4vh, 6px);
}

.l4-countdown {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: clamp(8px, 1vw, 18px);
  font-family: 'Inter', sans-serif;
  font-size: clamp(20px, 3.2vw, 42px);
  font-weight: 700;
  color: v-bind(labelAccent);
  line-height: 1;
  letter-spacing: 0;
  margin-top: clamp(4px, 0.6vh, 10px);
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* ── Tiles ───────────────────────────────────── */
.l4-tiles {
  display: flex;
  flex-shrink: 0;
  padding: clamp(8px, 1.4vh, 24px) clamp(20px, 2.5vw, 40px);
  gap: clamp(8px, 1.2vw, 20px);
}

.l4-tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(2px, 0.4vh, 8px);
  padding: clamp(8px, 1.3vh, 22px) clamp(8px, 1vw, 16px);
  border: 1px solid v-bind(resolvedTileBorder);
  border-radius: 10px;
  background: v-bind(resolvedSurface);
  transition: background 0.3s, border-color 0.3s;
}

.l4-tile.active {
  background: v-bind(resolvedSurface);
  border-color: v-bind(resolvedAccent);
  box-shadow: 0 0 24px v-bind(accentSoft);
}

.l4-tile-name {
  font-family: 'Inter', sans-serif;
  font-size: clamp(24px, 4vh, 50px);
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
}

.l4-tile.active .l4-tile-name {
  color: v-bind(resolvedAccent);
}

.l4-tile-line {
  width: 40%;
  height: 1px;
  background: v-bind(resolvedTileLine);
}

.l4-tile.active .l4-tile-line {
  background: v-bind(resolvedAccent);
  opacity: 0.4;
}

.l4-tile-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.l4-tile-label {
  font-size: clamp(13px, min(1.2vw, 1.9vh), 20px);
  text-transform: uppercase;
  letter-spacing: 2px;
  color: v-bind(resolvedAccent);
}

.l4-tile-time {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(26px, 4.2vh, 54px) * v-bind(adhanScale));
  font-weight: 700;
  color: v-bind(resolvedText);
  line-height: 1;
}
.l4-tile-time.l4-gold { font-size: calc(clamp(26px, 4.2vh, 54px) * v-bind(iqamahScale)); }

.l4-tile.active .l4-tile-time {
  color: v-bind(resolvedText);
}

/* ── Focus overlay ───────────────────────────── */
/* The screen itself is FocusScreen.vue; the board underneath just steps back. */
.l4-root.l4-faded > *:not(.fs-root) {
  opacity: 0;
  transition: opacity 0.8s ease;
}

.l4-root { touch-action: none; }   /* let horizontal swipes reach the handlers */

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic, which Inter does not — without it the RTL text falls back
   to whatever the WebView happens to have. */
[dir='rtl'] .l4-root,
.l4-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms
   apart, so letter-spacing is dropped wherever the script is RTL. */
[dir='rtl'] .l4-hero-label,
[dir='rtl'] .l4-hero-name,
[dir='rtl'] .l4-htime-label,
[dir='rtl'] .l4-tile-label,
[dir='rtl'] .l4-tile-name,
[dir='rtl'] .l4-jumuah-title {
  letter-spacing: 0;
}
[dir='rtl'] .l4-jumuah {
  right: auto;
  left: clamp(16px, 2.4vw, 44px);
}
/* The logo slot is positioned, not laid out, so it does not flip with the direction:
   in Arabic it sat on the left, under the date stack that `justify-self: end` had just
   moved there. */
[dir='rtl'] .l4-logo-slot {
  left: auto;
  right: clamp(42px, 5.25vw, 84px);
  justify-content: flex-end;
}
/* Times and countdowns are Latin numerals; keep them running left-to-right so a
   leading "0" or an AM/PM marker does not get flipped to the wrong end. */
[dir='rtl'] .l4-countdown-num,
[dir='rtl'] .l4-htime-val,
[dir='rtl'] .l4-tile-time,
[dir='rtl'] .l4-jumuah-time {
  direction: ltr;
  unicode-bidi: isolate;
}

</style>
