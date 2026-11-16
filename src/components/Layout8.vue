<template>
  <div
    class="tex-root"
    :dir="dir"
    :class="{ 'is-dark': darkMode }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <div class="tex-bg">
      <div v-if="bgImage" class="tex-image night-dim" :style="bgImageStyle"></div>
      <div v-else class="tex-pattern"></div>
      <div class="tex-backdrop"></div>
    </div>

    <div class="tex-main-container" :class="{ faded: focusVisible }">
      <div class="tex-left-panel">
        <div class="tex-next-prayer-container">
          <div class="tex-next-prayer-label">{{ T.next }}</div>
          <div class="tex-next-prayer-name" :class="{ 'is-jumuah': nextCard?.isJumuah }">{{ nextPrayerName }}</div>
          <div class="tex-next-speaker" v-if="nextCard?.speaker">{{ nextCard.speaker }}</div>
          <div class="tex-prayer-time-section" v-if="nextCard?.isJumuah">
            <div class="tex-pt-label">{{ T.khutbahStartsAt }}</div>
            <div class="tex-next-iqamah-time">{{ nextIqamah }}</div>
          </div>
          <template v-else>
            <div class="tex-prayer-time-section">
              <div class="tex-pt-label">{{ T.adhanCaps }}</div>
              <div class="tex-next-athan-time">{{ nextAdhan }}</div>
            </div>
            <div class="tex-prayer-time-section">
              <div class="tex-pt-label">{{ T.iqamahCaps }}</div>
              <div class="tex-next-iqamah-time">{{ nextIqamah }}</div>
            </div>
          </template>
        </div>
        <!-- Friday only: the sessions, in the sidebar's own space. -->
        <div class="tex-jumuah" v-if="jumuahSessions.length">
          <div class="tex-jumuah-title">{{ T.jumuah }}</div>
          <div
            v-for="s in jumuahSessions"
            :key="s.key"
            class="tex-jumuah-row"
            :class="{ next: s.isNext }"
          >
            <div class="tex-jumuah-name">{{ s.name }}</div>
            <div class="tex-jumuah-speaker" v-if="s.speaker">{{ s.speaker }}</div>
            <div class="tex-jumuah-time">{{ s.time }}</div>
          </div>
        </div>

        <div class="tex-radio-bar" v-if="isRadioPlaying">
          <div class="tex-radio-dot"></div>
          <div>
            <div class="tex-radio-label">{{ T.nowPlaying }}</div>
            <div class="tex-radio-name">{{ radioName }}</div>
          </div>
        </div>
      </div>

      <div class="tex-right-panel">
        <img v-if="mosqueLogoSrc" class="tex-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />
        <div class="tex-clock-container">
          <div class="tex-current-time">{{ currentTime }}</div>
          <div class="tex-current-date">{{ currentDate }}</div>
          <div class="tex-current-hijri" v-if="showHijri">{{ currentHijriDate }}</div>
        </div>
        <PrayerGrid :prayers="gridCards" :iqamah-label="T.iqamah" />
        <div class="tex-status">{{ status }}</div>
      </div>
    </div>

    <!-- The shared focus screen (FocusScreen.vue), alternating every focusIntervalSec
         and holding all night pinned to Fajr. -->
    <FocusScreen
      :active="focusVisible"
      :prayer="focusScreenPrayer"
      :now="nowTick"
      :lang="lang"
      :accent-color="primaryColor"
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
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import PrayerGrid from './PrayerGrid.vue'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { formatClock, formatHijri, getPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahIndex } from '../utils/jumuah.js'
import { darken, hexToRgb, resolveThemedAny, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  prayerData:     Object,
  // Always today's slice: the night window starts from *today's* Isha iqamah even
  // once the rest of the screen has rolled over to tomorrow's times.
  todayPrayerData: Object,
  baseDate:       { type: Date, default: () => new Date() },
  // Minutes after Isha iqamah before the all-night Fajr focus takes over; 'off' disables.
  nightFocusAfterIshaMin: { type: String, default: '20' },
  // ── Focus screen (FocusScreen.vue) ───────────────────────────────────────
  // Scrim colour and how far it covers the board; 'on' carries the board's photo
  // onto the screen under that scrim.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.88' },
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000; the dimmer (0.3-1) fades its content.
  focusOled:    { type: String, default: 'off' },
  focusDimDefault: { type: [Number, String], default: 1 },
  // 'analog' puts the dial on the focus screen's leading edge; 'digital' the readout.
  focusClock:   { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting, which decides
  // what the focus screen's countdown pill counts to.
  countdownFor: { type: String, default: 'athan' },
  nextPrayerKey:  String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // 'en' | 'ar' — flips every label and the text direction.
  lang:           { type: String, default: 'en' },
  radioName:      String,
  isRadioPlaying: Boolean,
  status:         String,
  // Native-configurable colors (Android toolbar). Reactive → live updates.
  svgPathColor: { type: String, default: '#cd7f32' },
  sidebarBg:    { type: String, default: 'rgba(8,8,8,0.94)' },
  // Two sidebar colors, independent of the tile accent (primaryColor) so the
  // sidebar stays readable even when a theme sets accent == sidebarBg.
  sidebarTextColor:   { type: String, default: '#FFFFFF' }, // plain sidebar text
  sidebarAccentColor: { type: String, default: '#cd7f32' }, // sidebar iqamah highlight
  mainBg:       { type: String, default: '#081018' },
  primaryColor: { type: String, default: '#cd7f32' },
  tileColor:    { type: String, default: '#ffffff' },
  // Font color for the clock + prayer-time text (on the tiles). The muted
  // prayer-name color is derived from it.
  secondaryColor: { type: String, default: '#000000' },
  // Seconds between focus-view toggles. 0 (or less) disables it entirely.
  focusIntervalSec: { type: Number, default: 30 },
  // Optional photo background. When bgImage is set it replaces the SVG texture;
  // bgRepeat tiles it (true) vs covers the screen (false). Empty = texture.
  bgImage:  { type: String, default: '' },
  bgRepeat: { type: [Boolean, String], default: false },
  // Font-size scale factors for the adhan / iqamah times (1 = default).
  adhanScale:  { type: String, default: '1' },
  iqamahScale: { type: String, default: '1' },
  timeFormat:  { type: String, default: '12' },
  hijriOffset: { type: Number, default: 0 },
  showSeconds: { type: Boolean, default: true },
  showHijri:   { type: Boolean, default: true },
  showSunrise: { type: Boolean, default: true },
  showMosque:  { type: Boolean, default: true },
  mosqueLogoSrc: { type: String, default: '' },
  mosqueLogoWidth: { type: String, default: clampCqi('120px', 20, '180px') },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

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

const resolvedTileBg = computed(() =>
  resolveThemedColor(props.tileColor, 'surface', props.darkMode)
)
const resolvedTileText = computed(() =>
  resolveThemedColor(props.secondaryColor, 'text', props.darkMode)
)
const resolvedTileTextMuted = computed(() => {
  const { r, g, b } = hexToRgb(resolvedTileText.value)
  return `rgba(${r}, ${g}, ${b}, 0.6)`
})
const resolvedSidebarBg = computed(() =>
  resolveThemedAny(props.sidebarBg, 'panel', props.darkMode)
)
const resolvedSidebarText = computed(() =>
  resolveThemedColor(props.sidebarTextColor, 'onPanel', props.darkMode)
)
const resolvedSidebarAccent = computed(() =>
  resolveThemedColor(props.sidebarAccentColor, 'accent', props.darkMode)
)
const resolvedPrimary = computed(() =>
  resolveThemedColor(props.primaryColor, 'accent', props.darkMode)
)
const resolvedPrimaryDark = computed(() => {
  const base = props.darkMode ? resolvedPrimary.value : props.primaryColor
  return darken(base, 0.82)
})
const resolvedPrimaryGlow = computed(() =>
  toRgba(props.darkMode ? resolvedPrimary.value : props.primaryColor, props.darkMode ? 0.28 : 0.32)
)
const resolvedPanelBorder = computed(() =>
  props.darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)',
)
const resolvedPanelDivider = computed(() =>
  props.darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.1)',
)
const resolvedNextCardText = computed(() => '#ffffff')
const resolvedNextCardTextMuted = computed(() => 'rgba(255, 255, 255, 0.75)')

const showFocus   = ref(false)
const { lang, dir, T, localeTag, dateLocale } = useLayoutLang(props)

const currentTime = ref('00:00')
const currentDate = ref('Loading...')
const currentHijriDate = ref('')

let clockInterval = null

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',   isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',  isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',    isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',   isFajr: false, isDhuhr: false },
]

const hour12 = computed(() => props.timeFormat !== '24')
const displayTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: false })
const prayerTime = (key, suffix) => {
  if (!props.prayerData) return '--:--'
  const p = PRAYERS.find(x => x.key === key)
  const raw = props.prayerData[key + suffix]
  return raw && p ? displayTime(getPrayerDateTime(raw, p.isFajr, p.isDhuhr)) : '--:--'
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

const nextAdhan = computed(() => nextCard.value?.adhan ?? '--:--')

const nextIqamah = computed(() => nextCard.value?.iqamah ?? '--:--')

/** The five daily prayers — and the five cards in the grid. The grid is sized for
 *  exactly these: a mosque with three or four Jumu'ah sessions pushed seven or eight
 *  cards into it and the last ones ran off the panel, so the sessions get a block of
 *  their own in the sidebar (see `jumuahSessions`). */
const gridCards = computed(() => {
  const nk = props.nextPrayerKey
  return PRAYERS.map(p => ({
    key:       p.key,
    name:      T.value[p.key],
    adhan:     prayerTime(p.key, '_azaan'),
    iqamah:    prayerTime(p.key, '_iqamah'),
    isCurrent: nk === p.key,
  }))
})

/** The same list with Friday's Dhuhr card expanded into one per session. The sidebar
 *  headline and the focus view read from this one: whatever the grid shows, the board
 *  has to headline the session that is actually next. */
const prayerCards = computed(() =>
  withJumuahRows(gridCards.value, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:    `jumuah-${i}`,
    name:      jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:    displayTime(jumuahDate(s.time, nowTick.value)),
    speaker:   s.speaker || '',
    isJumuah:  true,
    isCurrent: dhuhr.isCurrent && isNext,
  }), nowTick.value)
)

/** Friday's sessions for the sidebar block. Empty on any other day. */
const jumuahSessions = computed(() => {
  const list = props.jumuahPrayers || []
  const nextIdx = nextJumuahIndex(list, nowTick.value)
  return list.map((s, i) => ({
    key:     `jumuah-${i}`,
    name:    jumuahName(s, { lang: lang.value, index: i, count: list.length, label: T.value.jumuah }),
    time:    displayTime(jumuahDate(s.time, nowTick.value)),
    speaker: s.speaker || '',
    isNext:  i === nextIdx,
  }))
})

function tick() {
  const now = debugNow()
  nowTick.value = now
  currentTime.value = formatClock(now, { hour12: hour12.value, seconds: props.showSeconds, hour: '2-digit', locale: localeTag.value })
  currentDate.value = now.toLocaleDateString(dateLocale.value, { weekday: 'long', month: 'long', day: 'numeric' })
  // The hijri line has always been rendered in Arabic here (Tajawal face), in both
  // languages — it reads as a calligraphic accent rather than a translated label.
  currentHijriDate.value = formatHijri(now, props.hijriOffset, 'ar-SA')
}

// ── Focus screen ─────────────────────────────────────────────────────────────
// The night focus, the two-stage countdown and the screen itself are shared with
// every other layout — see FocusScreen.vue and utils/focusScreen.js. This layout
// decides only *when* the screen is up.
const nowTick = ref(debugNow())
const {
  nightFocusActive, adhanPassed, pillTarget, awaitingIqamah,
  countdown: focusCountdown,
} = useFocusScreen({
  now:                    nowTick,
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
const manualView = ref(null)     // null = automatic, true = focus, false = board

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

onMounted(() => {
  tick()
  clockInterval = setInterval(tick, 1000)
  restartFocusInterval()
})

// Re-arm (or stop) the focus toggle when the native control changes it.
watch(() => props.focusIntervalSec, restartFocusInterval)
// currentTime/currentDate are refs filled by tick(), so a language switch needs a
// repaint rather than waiting for the next one-second tick.
watch(lang, () => tick())

onUnmounted(() => {
  clearInterval(clockInterval)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(tick, toggleView)
</script>

<style>
/* ──────────────────────────────────────────────────────────────
   Islamic Texture (Repeat) layout — clone of MainLayout.
   All selectors are namespaced under .tex-root so the global CSS
   does not collide with MainLayout's #left-panel / #bg-image IDs.
   The 3 native-configurable colors are bound via v-bind().
   ────────────────────────────────────────────────────────────── */
.tex-root { color: #fff; touch-action: none; }   /* let horizontal swipes reach the handlers */

/* ── BACKGROUND LAYER ── */
.tex-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-color: v-bind(mainBg);
}
.tex-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.tex-pattern {
  position: absolute;
  inset: 0;
  /* The SVG is a single white-fill pattern used as a MASK, not an image:
     the painted color (svgPathColor) shows only through the pattern's
     shapes — so it colors the texture's strokes — while the transparent
     gaps reveal mainBg (painted on .tex-bg) behind it. */
  background-color: v-bind(svgPathColor);
  -webkit-mask: url("/prayer-dash/assets/islamic-texture.svg") repeat;
          mask: url("/prayer-dash/assets/islamic-texture.svg") repeat;
  -webkit-mask-size: 800px;
          mask-size: 800px;

  /* background-image: url("/prayer-dash/assets/islamic-texture.svg"); */
  opacity: 0.45;
}
.tex-backdrop {
  position: absolute;
  inset: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}

/* ── MAIN CONTAINER ── */
.tex-main-container {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  transition: opacity 0.8s ease;
}
.tex-main-container.faded { opacity: 0; pointer-events: none; }

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
.tex-left-panel {
  width: 35%;
  background: v-bind(resolvedSidebarBg);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: clamp(24px, 4vh, 48px) clamp(20px, 3vw, 44px);
  border-right: 1px solid v-bind(resolvedPanelBorder);
  position: relative;
  overflow: hidden;
  height: 100vh;
  backdrop-filter: blur(10px);
}
/* A single sheen down the panel: the sidebar is a slab of flat colour against a
   photograph, and the gradient gives it an edge to read as glass rather than a hole. */
.tex-left-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.02) 42%, rgba(0, 0, 0, 0.12) 100%);
}
.tex-left-panel > * { position: relative; z-index: 1; }

.tex-next-prayer-container {
  flex: 1; display: flex; flex-direction: column; justify-content: space-evenly;
}
.tex-next-prayer-label {
  font-size: clamp(1rem, 2vh, 1.5rem); color: v-bind(resolvedSidebarAccent); font-weight: 800;
  letter-spacing: 5px; text-transform: uppercase;
}
.tex-next-speaker {
  font-size: clamp(2rem, 4.4vh, 3.4rem); font-weight: 600; line-height: 1.25;
  color: v-bind(resolvedPrimary); margin-bottom: clamp(8px, 1.4vh, 16px);
}
.tex-next-prayer-name {
  font-size: clamp(4rem, 10vh, 10rem); font-weight: 800; text-transform: uppercase; line-height: 1; color: v-bind(resolvedSidebarText);
}
.tex-next-prayer-name.is-jumuah { font-size: calc(clamp(4rem, 10vh, 10rem) * 0.55); line-height: 1.1; }
.tex-prayer-time-section {
  padding-top: clamp(14px, 2vh, 24px);
  border-top: 1px solid v-bind(resolvedPanelDivider);
}
.tex-pt-label {
  font-size: clamp(1.5rem, 2vh, 1.5rem); color: v-bind(resolvedSidebarAccent); font-weight: 800;
  letter-spacing: 3px; text-transform: uppercase; margin-bottom: clamp(4px, 0.8vh, 8px);
}
.tex-next-athan-time  { font-size: calc(clamp(3.5rem, 16vh, 9rem) * v-bind(adhanScale)); font-weight: 700; line-height: 1; color: v-bind(resolvedSidebarText); }
.tex-next-iqamah-time { font-size: calc(clamp(3.5rem, 16vh, 9rem) * v-bind(iqamahScale)); font-weight: 900; color: v-bind(resolvedSidebarAccent); line-height: 1; }

/* ── RIGHT PANEL ── */
.tex-right-panel {
  width: 64%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  padding: clamp(18px, 3vh, 28px) clamp(18px, 2.5vw, 34px);
  position: relative;
  overflow: hidden;
}
.tex-clock-container {
  text-align: center;
  background: v-bind(resolvedTileBg);
  border-radius: 10px;
  padding: 16px;
}

.tex-mosque-logo {
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
}

.tex-current-time {
  font-size: clamp(3.6rem, 11.5vh, 9rem); font-weight: 800;
  letter-spacing: -2px; line-height: 1; margin: 0; color: v-bind(resolvedTileText);
}
.tex-current-date { font-size: clamp(1.9rem, 2.5vh, 2rem); color: v-bind(resolvedTileText); letter-spacing: 1px; margin-top: 8px; }
.tex-current-hijri { font-size: clamp(1.5rem, 3vh, 2.4rem); font-weight: 600; color: v-bind(resolvedTileText); margin-top: 4px; font-family: 'Tajawal', sans-serif; }

/* ── PRAYER GRID (shared markup from PrayerGrid.vue) ── */
.tex-root .prayer-grid { display: flex; justify-content: space-between; width: 100%; gap: clamp(8px, 1vw, 16px); }
.tex-root .prayer-card {
  flex: 1; text-align: center; padding: clamp(16px, 2.5vh, 28px) clamp(12px, 1.5vw, 18px);
  background: v-bind(resolvedTileBg) !important;
  border-radius: clamp(14px, 2vh, 20px);
  border: 1px solid v-bind(resolvedPanelBorder);
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.tex-root .prayer-card.next {
  background: linear-gradient(180deg, v-bind(resolvedPrimary) 0%, v-bind(resolvedPrimaryDark) 100%);
  transform: scale(1.08);
  box-shadow: 0 18px 40px v-bind(resolvedPrimaryGlow) !important;
  border-color: transparent;
}
.tex-root .prayer-name {
  font-size: clamp(1.1rem, 2.5vh, 1.8rem); font-weight: 700; text-transform: uppercase;
  color: v-bind(resolvedTileTextMuted) !important; letter-spacing: 1px; margin-bottom: clamp(6px, 1.2vh, 12px);
}
.tex-root .prayer-card.next .prayer-name { color: v-bind(resolvedNextCardTextMuted); }
.tex-root .prayer-speaker {
  font-size: clamp(0.75rem, 1.6vh, 1.05rem); font-weight: 600; line-height: 1.2;
  color: v-bind(resolvedTileTextMuted) !important;
  margin-top: calc(-1 * clamp(2px, 0.6vh, 7px)); margin-bottom: clamp(6px, 1.1vh, 11px);
}
.tex-root .prayer-time { font-size: calc(clamp(1.8rem, 4.5vh, 3.5rem) * v-bind(adhanScale)); font-weight: 800;
  color: v-bind(resolvedTileText) !important; line-height: 1; }
.tex-root .prayer-card.next .prayer-time { color: v-bind(resolvedNextCardText); }
.tex-root .time-label {
  font-size: clamp(0.85rem, 1.8vh, 1.2rem); color: v-bind(resolvedTileText) !important; letter-spacing: 1.5px;
  text-transform: uppercase; margin-top: clamp(8px, 1.2vh, 14px); margin-bottom: 4px;
}
.tex-root .prayer-card.next .time-label { color: v-bind(resolvedNextCardTextMuted); }
.tex-root .iqamah-time { font-size: calc(clamp(2rem, 4.5vh, 3.8rem) * v-bind(iqamahScale)); font-weight: 700; color: v-bind(resolvedPrimary) !important; line-height: 1; }
.tex-root .prayer-card.next .iqamah-time { color: v-bind(resolvedNextCardText); }
.tex-status { position: absolute; bottom: 14px; right: 18px; font-size: clamp(0.85rem, 1.5vh, 1.1rem); color: rgba(255,255,255,0.72); }

/* ── RADIO BAR ── */
/* ── Friday sessions ─────────────────────────────
   The grid on the right is five cards wide; the sidebar is where this board has room
   to list a mosque's three or four sessions. */
.tex-jumuah {
  margin-top: clamp(12px, 2vh, 28px);
  padding-top: clamp(10px, 1.6vh, 20px);
  border-top: 1px solid v-bind(resolvedPanelDivider);
  flex-shrink: 0;
}
.tex-jumuah-title {
  font-size: clamp(11px, 1.3vh, 16px);
  letter-spacing: 4px;
  text-transform: uppercase;
  font-weight: 700;
  color: v-bind(resolvedSidebarAccent);
  margin-bottom: clamp(6px, 1vh, 12px);
}
.tex-jumuah-row {
  display: flex; align-items: baseline; justify-content: space-between;
  /* The khateeb's name wraps onto its own full-width line under the session,
     so a long name never squeezes the time out of the narrow sidebar. */
  flex-wrap: wrap;
  gap: 2px 12px;
  padding: clamp(3px, 0.5vh, 7px) 0;
}
.tex-jumuah-name {
  font-size: clamp(12px, 1.6vh, 19px);
  font-weight: 600;
  color: v-bind(resolvedSidebarText);
  opacity: 0.8;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tex-jumuah-time {
  font-size: clamp(20px, 2.8vh, 34px);
  font-weight: 700;
  color: v-bind(resolvedSidebarAccent);
  line-height: 1.1;
}
.tex-jumuah-speaker {
  flex: 0 0 100%;
  order: 1;
  font-size: clamp(0.62rem, 1.35vh, 0.95rem);
  font-weight: 600;
  opacity: 0.7;
  line-height: 1.25;
}
.tex-jumuah-row.next .tex-jumuah-speaker { opacity: 0.9; }
.tex-jumuah-row.next .tex-jumuah-name { opacity: 1; }
.tex-jumuah-row.next .tex-jumuah-time { color: v-bind(resolvedSidebarText); }

.tex-radio-bar {
  position: absolute; bottom: clamp(18px, 3vh, 36px);
  left: clamp(18px, 3vw, 42px); right: clamp(18px, 3vw, 42px);
  padding-top: clamp(12px, 1.8vh, 18px); border-top: 1px solid v-bind(resolvedPanelDivider);
  display: flex; align-items: center; gap: 16px;
}
.tex-radio-dot {
  width: clamp(10px, 1.2vh, 14px); height: clamp(10px, 1.2vh, 14px);
  border-radius: 50%; background: v-bind(resolvedSidebarAccent);
  flex-shrink: 0; animation: tex-radio-pulse 1.4s ease-in-out infinite;
}
.tex-radio-label { font-size: clamp(0.9rem, 1.8vh, 1.2rem); color: v-bind(resolvedSidebarAccent); letter-spacing: 3px; font-weight: 700; text-transform: uppercase; }
.tex-radio-name  { font-size: clamp(1.2rem, 2.2vh, 1.7rem); font-weight: 600; color: v-bind(resolvedSidebarText); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@keyframes tex-radio-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.8); }
}

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic; the layout's Latin stack does not. */
.tex-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms apart. */
[dir='rtl'] .tex-next-prayer-label,
[dir='rtl'] .tex-next-prayer-name,
[dir='rtl'] .tex-pt-label,
[dir='rtl'] .tex-current-date,
[dir='rtl'] .tex-radio-label,
[dir='rtl'] .tex-root .prayer-name,
[dir='rtl'] .tex-root .time-label {
  letter-spacing: 0;
}
/* Times are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .tex-next-athan-time,
[dir='rtl'] .tex-next-iqamah-time,
[dir='rtl'] .tex-root .prayer-time,
[dir='rtl'] .tex-root .iqamah-time {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
