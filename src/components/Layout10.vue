<template>
  <div
    class="l10-root"
    :dir="dir"
    :class="{ 'is-dark': darkMode, 'l10-faded': focusVisible }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <div class="l10-bg night-dim" :style="bgStyle"></div>
    <div class="l10-wash"></div>
    <div class="l10-backdrop"></div>
    <img v-if="mosqueLogoSrc" class="l10-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />

    <section class="l10-clock">
      <div class="l10-time" :class="{ 'with-seconds': showSeconds }">
        <span class="l10-time-num">
          <span class="l10-time-part">{{ clockSegments.hour }}</span>
          <span class="l10-time-sep">:</span>
          <span class="l10-time-part">{{ clockSegments.minute }}</span>
          <template v-if="showSeconds">
            <span class="l10-time-sep">:</span>
            <span class="l10-time-part">{{ clockSegments.second }}</span>
          </template>
        </span>
        <span v-if="clockPeriod" class="l10-period">{{ clockPeriod }}</span>
      </div>
      <div class="l10-date">{{ dateLine }}</div>
      <div v-if="showHijri" class="l10-hijri">{{ hijriDate }}</div>
    </section>

    <main class="l10-main">
      <div class="l10-arabic" dir="rtl">{{ currentPrayerArabic }}</div>
    </main>

    <div class="l10-message">
      <!-- <div class="l10-title">IT'S {{ currentPrayerName }} TIME</div> -->
      <div class="l10-prayer-list">
        <div
          v-for="p in prayerRows"
          :key="p.rowKey || p.key"
          class="l10-prayer-pill"
          :class="{ active: p.key === displayPrayer.key && (!p.isJumuah || p.isNextJumuah) }"
        >
          <span class="l10-prayer-name">
            {{ p.name }}
            <span class="l10-prayer-speaker" v-if="p.speaker">{{ p.speaker }}</span>
          </span>
          <strong>{{ p.adhan }}</strong>
          <strong>{{ p.iqamah }}</strong>
        </div>
      </div>
    </div>

    <!-- The shared focus screen (FocusScreen.vue), alternating every focusIntervalSec
         and holding all night pinned to Fajr. -->
    <FocusScreen
      :active="focusVisible"
      :prayer="focusScreenPrayer"
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
      :photo-image="focusPhotoImage"
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

    <aside class="l10-orb">
      <div class="l10-orb-current">
        <span>{{ currentPrayerName }}</span>
        <small>{{ T.currentUntilIqamah }}</small>
        <div class="l10-orb-speaker" v-if="displayRow?.speaker">{{ displayRow.speaker }}</div>
        <div class="l10-orb-times">
          <div v-if="displayRow?.isJumuah">
            <strong>{{ nextIqamahTime }}</strong>
            <small>{{ T.khutbahStartsAt }}</small>
          </div>
          <template v-else>
            <div>
              <strong>{{ nextAdhanTime }}</strong>
              <small>{{ T.adhanCaps }}</small>
            </div>
            <div>
              <strong>{{ nextIqamahTime }}</strong>
              <small>{{ T.iqamahCaps }}</small>
            </div>
          </template>
        </div>
      </div>
    </aside>

    <div v-if="showSunrise && sunriseTime" class="l10-sun">
      <span>{{ T.sunriseCaps }}</span>
      <strong>{{ sunriseTime }}</strong>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { boardPhase, resetRotation, restartRotationDwell } from '../utils/viewRotation.js'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate } from '../utils/jumuah.js'
import { adaptForNight, mixHex, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  // Focus-screen scrim: its color and how far it covers the board. Dark mode keeps
  // its own night palette regardless — see FocusScreen.vue.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.88' },
  // 'on' carries whatever photo the board is showing onto the focus screen.
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000; the dimmer (0.3-1) fades its content.
  focusOled:    { type: String, default: 'off' },
  focusDimDefault: { type: [Number, String], default: 1 },
  // 'analog' puts the dial on the focus screen's leading edge; 'digital' the readout.
  focusClock:   { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting, which decides
  // what the focus screen's countdown pill counts to.
  countdownFor: { type: String, default: 'athan' },
  // Optional background photo replacing the per-prayer gallery. '' = rotate as usual.
  photoImage:   { type: String, default: '' },
  photoRepeat:  { type: [Boolean, String], default: false },
  prayerData:     Object,
  // Always today's slice: the night window starts from *today's* Isha iqamah even
  // once the rest of the screen has rolled over to tomorrow's times.
  todayPrayerData: Object,
  baseDate:       { type: Date, default: () => new Date() },
  // Minutes after Isha iqamah before the all-night Fajr focus takes over; 'off' disables.
  nightFocusAfterIshaMin: { type: String, default: '20' },
  // Seconds between focus-view toggles. 0 disables it.
  focusIntervalSec: { type: Number, default: 30 },
  nextPrayerKey:  String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // 'en' | 'ar' — flips every label and the text direction. The big calligraphic
  // hero stays Arabic either way; it is the layout's signature element.
  lang:           { type: String,  default: 'en' },
  timeFormat:     { type: String,  default: '12' },
  hijriOffset:    { type: Number,  default: 0 },
  showSeconds:    { type: Boolean, default: true },
  showHijri:      { type: Boolean, default: true },
  showSunrise:    { type: Boolean, default: true },
  showMosque:     { type: Boolean, default: true },
  mosqueLogoSrc:  { type: String, default: '' },
  mosqueLogoWidth: { type: String, default: clampCqi('120px', 20, '180px') },
  primaryColor:   { type: String,  default: '#050505' },
  secondaryColor: { type: String,  default: '#050505' },
  accentColor:    { type: String,  default: '#e4c45a' },
  panelColor:     { type: String,  default: '#062247' },
  surfaceColor:   { type: String,  default: '#F8F8F8' },
  clockScale:     { type: String,  default: '1' },
  arabicScale:    { type: String,  default: '1' },
  listScale:      { type: String,  default: '1' },
  orbScale:       { type: String,  default: '1' },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

const IMAGES = {
  fajr:    'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/madina-1.jpg',
  dhuhr:   'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/aqsa-1.jpg',
  asr:     'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/makka-1.jpg',
  maghrib: 'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/aqsa-2.jpg',
  isha:    'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/madina-2.jpg',
}

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    arabic: 'الفجر',   isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   arabic: 'الظهر',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     arabic: 'العصر',   isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب',  isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    arabic: 'العشاء',  isFajr: false, isDhuhr: false },
]

const { lang, dir, T, localeTag, dateLocale } = useLayoutLang(props, {
  en: { currentUntilIqamah: 'CURRENT UNTIL IQAMAH' },
  ar: { currentUntilIqamah: 'الحالية حتى الإقامة' },
})

const NIGHT_BASE_FOR_ROOT = '#0c1018'

const now = ref(debugNow())
let timer = null

const hour12 = computed(() => props.timeFormat !== '24')
const clockParts = computed(() => formatClock(now.value, {
  hour12: hour12.value,
  seconds: props.showSeconds,
  hour: '2-digit',
  split: true,
  locale: localeTag.value,
}))
const clockNum = computed(() => clockParts.value.num)
const clockPeriod = computed(() => clockParts.value.period)
const clockSegments = computed(() => {
  const [hour = '--', minute = '--', second = '--'] = String(clockNum.value || '').split(':')
  return { hour, minute, second }
})
const dateLine = computed(() =>
  now.value.toLocaleDateString(dateLocale.value, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
)
// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(now.value, props.hijriOffset, lang.value))

const prayerDateTime = (p, suffix) => {
  const raw = props.prayerData?.[p.key + suffix]
  return raw ? getPrayerDateTime(raw, p.isFajr, p.isDhuhr) : null
}
const displayPrayerTime = date => date ? formatClock(date, { hour12: hour12.value, seconds: false, period: false }) : '--:--'

const currentPrayer = computed(() => {
  if (!props.prayerData) return PRAYERS[1]
  const current = [...PRAYERS].reverse().find(p => {
    const t = prayerDateTime(p, '_azaan')
    return t && t <= now.value
  })
  return current || PRAYERS[4]
})

const displayPrayer = computed(() =>
  PRAYERS.find(p => p.key === props.nextPrayerKey) || currentPrayer.value
)

/** Friday maps the Dhuhr key onto several rows, so the panel follows the row the
 *  schedule is highlighting rather than the bare prayer key. */
const displayRow = computed(() => {
  const rows = prayerRows.value.filter(r => r.key === displayPrayer.value.key)
  return rows.find(r => r.isNextJumuah) || rows[0] || null
})
const currentPrayerName = computed(() =>
  displayRow.value ? String(displayRow.value.name).toUpperCase() : T.value[displayPrayer.value.key].toUpperCase()
)
const currentPrayerArabic = computed(() => displayRow.value?.speaker ? displayRow.value.name : displayPrayer.value.arabic)
const nextAdhanTime = computed(() => displayRow.value?.adhan ?? displayPrayerTime(prayerDateTime(displayPrayer.value, '_azaan')))
const nextIqamahTime = computed(() => displayRow.value?.iqamah ?? displayPrayerTime(prayerDateTime(displayPrayer.value, '_iqamah')))
const prayerRows = computed(() => {
  const rows = PRAYERS.map(p => ({
    key: p.key,
    name: T.value[p.key].toUpperCase(),
    adhan: displayPrayerTime(prayerDateTime(p, '_azaan')),
    iqamah: displayPrayerTime(prayerDateTime(p, '_iqamah')),
  }))
  // On Friday the Dhuhr row becomes one row per Jumu'ah session.
  return withJumuahRows(rows, props.jumuahPrayers, (dhuhr, s, i) => ({
    ...dhuhr,
    rowKey: `jumuah-${i}`,
    name: jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }).toUpperCase(),
    iqamah: displayPrayerTime(jumuahDate(s.time)),
    speaker: s.speaker || '',
  }))
})
const sunriseTime = computed(() =>
  props.prayerData?.sunrise
    ? displayPrayerTime(getPrayerDateTime(props.prayerData.sunrise, true, false))
    : ''
)

// The gallery rotates a photo per prayer, but a mosque can pin one background of
// its own from the Image & Logo menu — that photo then stays up all day.
const bgStyle = computed(() => {
  const custom = String(props.photoImage || '').trim()
  if (!custom) return { backgroundImage: `url("${IMAGES[displayPrayer.value.key]}")` }
  const tiled = props.photoRepeat === true || props.photoRepeat === 'true'
  return {
    backgroundImage:  `url("${custom}")`,
    backgroundSize:   tiled ? 'auto'   : 'cover',
    backgroundRepeat: tiled ? 'repeat' : 'no-repeat',
  }
})

const resolvedPrimary = computed(() =>
  resolveThemedColor(props.primaryColor, 'onPanel', props.darkMode)
)
const resolvedSecondary = computed(() =>
  resolveThemedColor(props.secondaryColor, 'text', props.darkMode)
)
const resolvedPanel = computed(() =>
  resolveThemedColor(props.panelColor, 'panel', props.darkMode)
)
const resolvedSurface = computed(() =>
  resolveThemedColor(props.surfaceColor, 'surface', props.darkMode)
)
const resolvedAccent = computed(() =>
  resolveThemedColor(props.accentColor, 'accent', props.darkMode)
)
const resolvedArabic = computed(() =>
  props.darkMode
    ? resolveThemedColor(props.primaryColor, 'onPanel', props.darkMode)
    : props.panelColor
)
const resolvedOnPanel = computed(() =>
  resolveThemedColor(props.secondaryColor, 'onPanel', props.darkMode)
)
const resolvedRootBg = computed(() =>
  props.darkMode ? mixHex(NIGHT_BASE_FOR_ROOT, resolvedPanel.value, 0.28) : '#f6efe4'
)
const resolvedOrbBorder = computed(() =>
  props.darkMode
    ? toRgba(resolvedAccent.value, 0.38)
    : 'rgba(255, 244, 202, 0.95)'
)
const resolvedArabicShadow = computed(() =>
  props.darkMode ? '0 6px 20px rgba(0, 0, 0, 0.55)' : '0 8px 26px rgba(255, 255, 255, 0.65)'
)
const resolvedHijriOpacity = computed(() => (props.darkMode ? 0.62 : 0.72))
const resolvedActiveRing = computed(() =>
  props.darkMode ? toRgba(resolvedAccent.value, 0.42) : toRgba(props.accentColor, 1)
)
const resolvedActiveRingSoft = computed(() =>
  props.darkMode ? toRgba(resolvedAccent.value, 0.32) : toRgba(props.accentColor, 1)
)

// ── Focus view, night focus and swipe (mirrors Classic Islamic Cards) ───────
const showFocus = ref(false)

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
  focusIsJumuah:          () => !!focusRow.value?.isJumuah,
})

// A swipe parks the view on one side until the next tick (day) or the next swipe
// (night, where nothing alternates to hand it back).
const manualView = ref(null)     // null = automatic, true = focus, false = rotating view

const focusVisible = computed(() => {
  if (manualView.value !== null) return manualView.value
  // awaitingIqamah holds the screen from the adhan to the iqamah.
  return nightFocusActive.value || awaitingIqamah.value || showFocus.value
})
/** The focus screen uses the dark palette all night, even if dark mode is off. */
const overlayDark = computed(() => props.darkMode || nightFocusActive.value)

/** The gallery has no single background photo: the focus screen stands on the
 *  pinned one, or on whichever prayer's image the board is showing. */
const focusPhotoImage = computed(() =>
  String(props.photoImage || '').trim() || IMAGES[displayPrayer.value.key] || ''
)

/** Fajr all night; otherwise whatever is next. */
const focusPrayer = computed(() =>
  nightFocusActive.value
    ? (PRAYERS.find(p => p.key === 'fajr') || displayPrayer.value)
    : displayPrayer.value
)
const focusRow = computed(() => {
  const rows = prayerRows.value.filter(r => r.key === focusPrayer.value.key)
  return rows.find(r => r.isNextJumuah) || rows[0] || null
})
const focusPrayerName = computed(() =>
  focusRow.value ? String(focusRow.value.name).toUpperCase() : T.value[focusPrayer.value.key].toUpperCase()
)
const focusAdhan  = computed(() => focusRow.value?.adhan ?? displayPrayerTime(prayerDateTime(focusPrayer.value, '_azaan')))
const focusIqamah = computed(() => focusRow.value?.iqamah ?? displayPrayerTime(prayerDateTime(focusPrayer.value, '_iqamah')))
/** The shared screen takes one prayer object; this layout keeps its pieces apart. */
const focusScreenPrayer = computed(() => ({
  name:     focusPrayerName.value,
  adhan:    focusAdhan.value,
  iqamah:   focusIqamah.value,
  speaker:  focusRow.value?.speaker || '',
  isJumuah: !!focusRow.value?.isJumuah,
}))

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
  timer = setInterval(() => { now.value = debugNow() }, 1000)
  restartFocusInterval()
})

onUnmounted(() => {
  clearInterval(timer)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() }, toggleView)
</script>

<style>
.l10-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: v-bind(resolvedSecondary);
  background: v-bind(resolvedRootBg);
  font-family: Inter, Lato, Montserrat, Roboto, sans-serif;
}

.l10-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.01);
}

.l10-wash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 244, 225, 0.1) 0%, rgba(255, 249, 241, 0.5) 48%, rgba(255, 255, 255, 0.88) 100%),
    linear-gradient(0deg, rgba(255, 235, 200, 0.32), rgba(207, 228, 244, 0.18));
}
.l10-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}

.l10-clock {
  position: absolute;
  z-index: 2;
  top: clamp(22px, 4vh, 58px);
  left: clamp(28px, 5vw, 82px);
  text-align: left;
  width: clamp(420px, 42vw, 760px);
}

.l10-time {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  align-items: baseline;
  column-gap: clamp(8px, 1vw, 16px);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(clamp(4.25rem, 8.8vh, 8.1rem) * v-bind(clockScale));
  line-height: 0.9;
  color: v-bind(resolvedSecondary);
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.l10-time-num {
  display: inline-grid;
  grid-template-columns: 2ch 0.5ch 2ch;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.l10-time.with-seconds .l10-time-num {
  grid-template-columns: 2ch 0.5ch 2ch 0.5ch 2ch;
}

.l10-time-part,
.l10-time-sep {
  display: block;
  text-align: center;
  white-space: nowrap;
}

.l10-period {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(clamp(1.4rem, 3vh, 2.65rem) * v-bind(clockScale));
  font-weight: 700;
  text-align: left;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.l10-date,
.l10-hijri {
  font-size: calc(clamp(1rem, 2.2vh, 1.8rem) * v-bind(clockScale));
  font-weight: 800;
  line-height: 1.15;
  color: v-bind(resolvedSecondary);
}

.l10-date { margin-top: clamp(10px, 1.2vh, 16px); }
.l10-hijri { font-weight: 700; opacity: v-bind(resolvedHijriOpacity); }

.l10-mosque-logo {
  position: absolute;
  z-index: 2;
  top: clamp(22px, 4vh, 58px);
  left: 50%;
  transform: translateX(-50%);
  display: block;
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
}

.l10-prayer-list {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 0.85vh, 10px);
  width: min(100%, 620px);
  margin-top: clamp(18px, 2.2vh, 30px);
}

.l10-next-pill,
.l10-prayer-pill {
  display: grid;
  align-items: center;
  font-size: calc(clamp(1.05rem, 2.4vh, 2rem) * v-bind(listScale));
  font-weight: 800;
  line-height: 1;
}

.l10-next-pill {
  grid-template-columns: minmax(0, 1fr) clamp(120px, 10vw, 190px);
}

.l10-prayer-pill {
  grid-template-columns: minmax(125px, 1fr) clamp(95px, 7.5vw, 150px) clamp(95px, 7.5vw, 150px);
  font-size: calc(clamp(0.85rem, 2.75vh, 2.45rem) * v-bind(listScale));
}

.l10-next-pill span {
  color: v-bind(resolvedOnPanel);
  background: v-bind(resolvedPanel);
  border-radius: 999px 0 0 999px;
  padding: clamp(12px, 1.8vh, 20px) clamp(16px, 2vw, 28px);
  text-align: center;
}

.l10-next-pill strong,
.l10-prayer-pill strong {
  color: v-bind(resolvedSecondary);
  background: v-bind(resolvedSurface);
  padding: clamp(12px, 1.8vh, 20px) clamp(16px, 2vw, 28px);
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: 700;
  text-align: center;
}

.l10-next-pill strong {
  border-radius: 0 999px 999px 0;
}

/* The khateeb goes inside the name pill, under the session name, so the three
   pill columns stay aligned however many sessions the mosque runs. */
.l10-prayer-speaker {
  display: block;
  font-size: 0.6em;
  font-weight: 600;
  opacity: 0.72;
  line-height: 1.25;
  margin-top: 0.3em;
}
.l10-prayer-name {
  color: v-bind(resolvedPrimary);
  background: v-bind(resolvedPanel);
  border-radius: 999px 0 0 999px;
  padding: clamp(9px, 1.25vh, 15px) clamp(12px, 1.4vw, 22px);
  text-align: center;
}

.l10-prayer-pill strong {
  padding: clamp(9px, 1.25vh, 15px) clamp(12px, 1.4vw, 22px);
}

.l10-prayer-pill strong:last-child {
  border-radius: 0 999px 999px 0;
}

.l10-prayer-pill.active .l10-prayer-name {
  background: v-bind(resolvedPanel);
  box-shadow: inset 0 0 0 3px v-bind(resolvedActiveRing);
}

.l10-prayer-pill.active strong {
  background: v-bind(resolvedSurface);
  box-shadow: inset 0 0 0 2px v-bind(resolvedActiveRingSoft);
}

.l10-main {
  position: absolute;
  z-index: 1;
  right: clamp(42px, 6vw, 110px);
  top: 12.25vh;
  width: min(48vw, 850px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.l10-arabic {
  font-family: 'Noto Nastaliq Urdu', 'Amiri', serif;
  font-size: calc(clamp(7rem, 15vw, 18rem) * v-bind(arabicScale));
  font-weight: 700;
  line-height: 1.35;
  color: v-bind(resolvedArabic);
  text-shadow: v-bind(resolvedArabicShadow);
}

.l10-message {
  position: absolute;
  z-index: 2;
  right: clamp(42px, 6vw, 110px);
  bottom: clamp(20px, 2vh, 30px);
  width: min(48vw, 850px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.l10-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(clamp(2rem, 4.3vw, 5.2rem) * v-bind(listScale));
  line-height: 1;
  color: v-bind(resolvedSecondary);
  text-align: center;
  letter-spacing: 0;
}

/* The two discs are one pair, so both are positioned from the same three values:
   the orb used to hang off the bottom-left corner (a negative `bottom`) with the
   sunrise disc landing on its rim, which read as two circles colliding rather than
   a prayer and its sunrise. The orb now sits fully on the board and the sunrise
   disc is a satellite beside it, centred on the same line. */
.l10-root {
  --l10-orb-size:   clamp(330px, 32vw, 560px);
  --l10-orb-left:   clamp(32px, 4vw, 80px);
  --l10-orb-bottom: clamp(26px, 4vh, 66px);
  --l10-sun-size:   clamp(124px, 11.5vw, 182px);
}
.l10-orb {
  position: absolute;
  z-index: 2;
  left: var(--l10-orb-left);
  bottom: var(--l10-orb-bottom);
  width: var(--l10-orb-size);
  height: var(--l10-orb-size);
  border-radius: 50%;
  background: v-bind(resolvedPanel);
  border: clamp(6px, 0.7vw, 12px) solid v-bind(resolvedOrbBorder);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.35);
  color: v-bind(resolvedOnPanel);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(26px, 3vw, 54px) clamp(24px, 2.6vw, 48px);
}

.l10-orb-current {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  line-height: 1;
  text-align: center;
}

.l10-orb-current span {
  font-size: calc(clamp(2.6rem, 5vw, 6rem) * v-bind(orbScale));
  font-weight: 700;
  letter-spacing: 0;
  color: v-bind(resolvedPrimary);
}

.l10-orb-current > small,
.l10-orb-times small {
  margin-top: clamp(12px, 1.8vh, 22px);
  color: v-bind(resolvedAccent);
  font-size: calc(clamp(0.9rem, 1.55vw, 1.55rem) * v-bind(orbScale));
  font-weight: 800;
  letter-spacing: 1px;
}

.l10-orb-times {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(14px, 2vw, 34px);
  margin-top: clamp(26px, 3vh, 42px);
}

.l10-orb-times div {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.l10-orb-times strong {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(clamp(2rem, 4vw, 4.9rem) * v-bind(orbScale));
  line-height: 0.95;
  font-weight: 700;
  color: v-bind(resolvedPrimary);
}

.l10-orb-times small {
  margin-top: clamp(8px, 1.1vh, 14px);
}

.l10-sun {
  position: absolute;
  z-index: 3;
  /* A badge on the orb's upper-right rim: its centre sits at 45° on a circle 0.875
     of the orb's radius out from the orb's own centre. */
  left: calc(var(--l10-orb-left) + var(--l10-orb-size) * 0.875 - var(--l10-sun-size) / 2);
  bottom: calc(var(--l10-orb-bottom) + var(--l10-orb-size) * 0.875 - var(--l10-sun-size) / 2);
  width: var(--l10-sun-size);
  height: var(--l10-sun-size);
  border-radius: 50%;
  background: v-bind(resolvedPanel);
  /* The same ring as the orb, at the smaller disc's scale, so they read as a set. */
  border: clamp(3px, 0.35vw, 6px) solid v-bind(resolvedOrbBorder);
  color: v-bind(resolvedPrimary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.l10-sun span {
  font-size: calc(clamp(0.7rem, 1.1vw, 1.1rem) * v-bind(orbScale));
  font-weight: 800;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.l10-sun strong {
  margin-top: 4px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: calc(clamp(1.3rem, 2.3vw, 2.3rem) * v-bind(orbScale));
  line-height: 1;
  white-space: nowrap;
}

.l10-root.is-dark .l10-wash {
  background:
    linear-gradient(90deg, rgba(6, 8, 14, 0.72) 0%, rgba(8, 10, 16, 0.82) 48%, rgba(10, 12, 18, 0.92) 100%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.42), rgba(0, 0, 0, 0.28));
}

.l10-root.is-dark .l10-orb {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}

.l10-root.is-dark .l10-sun {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

@media (max-aspect-ratio: 4/3) {
  .l10-clock {
    left: clamp(18px, 4vw, 48px);
    width: clamp(360px, 58vw, 560px);
  }

  .l10-main {
    top: 23.8vh;
    right: clamp(20px, 5vw, 56px);
    width: min(58vw, 620px);
  }

  .l10-message {
    right: clamp(20px, 5vw, 56px);
    bottom: clamp(48px, 7vh, 96px);
    width: min(58vw, 620px);
  }

  .l10-orb {
    width: clamp(299px, 48.3vw, 495px);
  }

  .l10-sun {
    display: none;
  }
}
/* ── Focus overlay (mirrors Classic Islamic Cards) ───────────────────────── */
.l10-root { touch-action: none; }   /* let horizontal swipes reach the handlers */

/* The screen itself is FocusScreen.vue; the board underneath just steps back. */
.l10-root.l10-faded > *:not(.fs-root) {
  opacity: 0;
  transition: opacity 0.8s ease;
}

/* ── Arabic ──────────────────────────────────────────────────────────────────
   The Georgia/Inter stacks have no Arabic coverage; Cairo does. The calligraphic
   hero (.l10-arabic) keeps its own Nastaliq/Amiri face in both languages. */
.l10-root[dir='rtl'],
.l10-root[dir='rtl'] .l10-date,
.l10-root[dir='rtl'] .l10-hijri,
.l10-root[dir='rtl'] .l10-prayer-name,
.l10-root[dir='rtl'] .l10-orb-current,
.l10-root[dir='rtl'] .l10-sun {
  font-family: 'Cairo', 'Noto Sans Arabic', Inter, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms apart. */
[dir='rtl'] .l10-orb-current > small,
[dir='rtl'] .l10-orb-times small {
  letter-spacing: 0;
}
/* Times are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .l10-time-num,
[dir='rtl'] .l10-prayer-pill strong,
[dir='rtl'] .l10-orb-times strong,
[dir='rtl'] .l10-sun strong {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
