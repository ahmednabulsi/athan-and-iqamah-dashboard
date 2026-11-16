<template>
  <div class="l2-root" :dir="dir" :class="{ 'is-dark': darkMode }">
    <PhotoBackdrop :image="photoImage" :repeat="photoRepeat" :text-color="textColor" />

    <!-- SLIDE 2: the shared focus screen (FocusScreen.vue), alternating with the
         board and holding all night pinned to Fajr. -->
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

    <div class="l2-app">

      <!-- LEFT -->
      <div class="l2-left">
        <div class="l2-clock">
          <div class="l2-time">{{ currentTime }}</div>
          <div class="l2-date">{{ currentDate }}</div>
        </div>

        <div class="l2-table-wrap">
          <div class="l2-table-header">
            <span>{{ T.prayer }}</span>
            <span>{{ T.adhan }}</span>
            <span>{{ T.iqamah }}</span>
          </div>
          <template v-for="p in prayers" :key="p.key">
            <div
              class="l2-prayer-row"
              :class="{ active: props.nextPrayerKey === p.key }"
            >
              <span class="l2-name">{{ p.name }}</span>
              <span class="l2-t l2-t-adhan">{{ p.adhan }}</span>
              <span class="l2-t l2-t-iqamah">{{ p.iqamah }}</span>
            </div>
            <div v-if="showSunrise && p.key === 'fajr' && sunriseTime && sunriseTime !== '--:--'" class="l2-sunrise-row">
              <span class="l2-sunrise-name">{{ T.sunrise }}</span>
              <span class="l2-sunrise-t">{{ sunriseTime }}</span>
              <span></span>
            </div>
          </template>
        </div>
      </div>

      <!-- RIGHT -->
      <div class="l2-right">
        <div class="l2-cards">
          <div class="l2-card l2-card-primary">
            <div class="l2-sub">{{ T.nextTitle }}</div>
            <div class="l2-next-name">{{ nextPrayerName }}</div>
            <div class="l2-countdown">{{ countdown }}</div>
            <div class="l2-sub">{{ T.remainingUntilIqamah }}</div>
          </div>

          <div class="l2-card l2-card-secondary">
            <img v-if="mosqueLogoSrc" class="l2-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />
            <div class="l2-info-row" v-if="showHijri">
              <span class="l2-info-label">{{ T.islamicDate }}</span>
              <span class="l2-info-value">{{ hijriDate }}</span>
            </div>
            <div class="l2-info-row" v-if="showSunrise">
              <span class="l2-info-label">{{ T.sunrise }}</span>
              <span class="l2-info-value">{{ sunriseTime }}</span>
            </div>
            <template v-if="isFriday">
              <template v-if="jumuahPrayers.length">
                <div class="l2-info-row l2-jumuah-header-row">
                  <span class="l2-info-label">{{ T.jumuah }}</span>
                </div>
                <div class="l2-jumuah-row" v-for="(j, i) in jumuahPrayers" :key="i">
                  <div class="l2-jumuah-left">
                    <span class="l2-jumuah-label">{{ j.label }}</span>
                    <span class="l2-jumuah-speaker" v-if="j.speaker">{{ j.speaker }}</span>
                  </div>
                  <span class="l2-jumuah-time">{{ j.time }}</span>
                </div>
              </template>
              <div class="l2-info-row" v-else>
                <span class="l2-info-label">{{ T.jumuah }}</span>
                <span class="l2-info-value">{{ jumuahTime }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="l2-footer">
          <div class="l2-location" v-if="showMosque && props.mosqueName">📍 {{ props.mosqueName }}</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { boardPhase, resetRotation } from '../utils/viewRotation.js'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import PhotoBackdrop from './PhotoBackdrop.vue'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime, getNextPrayerDateTime } from '../utils/prayerTime.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
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
  // ── Focus screen (FocusScreen.vue) ───────────────────────────────────────
  // Scrim colour and how far it covers the board; 'on' carries the board's photo
  // onto the screen under that scrim.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.92' },
  focusPhoto:   { type: String, default: 'off' },
  // 'oled' paints the focus screen pure #000; the dimmer (0.3-1) fades its content.
  focusOled:    { type: String, default: 'off' },
  focusDimDefault: { type: [Number, String], default: 1 },
  // 'analog' puts the dial on the focus screen's leading edge; 'digital' the readout.
  focusClock:   { type: String, default: 'analog' },
  // 'athan' | 'iqamah' | 'both' — the board's Countdown For setting, which decides
  // what the focus screen's countdown pill counts to.
  countdownFor: { type: String, default: 'athan' },
  // 'en' | 'ar' — flips every label and the text direction.
  lang:          { type: String, default: 'en' },
  nextPrayerKey: String,
  mosqueName:    String,
  mosqueUrl:     String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // Native-configurable colors (Android toolbar). Reactive → live updates.
  textColor:    { type: String, default: '#FFFFFF' },
  accentColor:  { type: String, default: '#22C55E' },
  bgColor:      { type: String, default: '#0F172A' },
  surfaceColor: { type: String, default: '#111827' },
  mutedTextColor:     { type: String, default: '#94a3b8' },
  secondaryTextColor: { type: String, default: '#e2e8f0' },
  subtleTextColor:    { type: String, default: '#64748b' },
  highlightTextColor: { type: String, default: '#fbbf24' },
  // Font-size scale factors for the adhan / iqamah times (1 = default).
  adhanScale:  { type: String, default: '1' },
  iqamahScale: { type: String, default: '1' },
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

// Soft accent washes for active rows / primary card, derived from accentColor.
function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(f, 16)
  return Number.isNaN(n) ? { r: 34, g: 197, b: 94 } : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const accentRgb    = computed(() => { const { r, g, b } = hexToRgb(props.accentColor); return `${r}, ${g}, ${b}` })
const accentSoft   = computed(() => `rgba(${accentRgb.value}, 0.15)`)
const accentBorder = computed(() => `rgba(${accentRgb.value}, 0.40)`)

const now = ref(debugNow())
const jumuahPrayers = computed(() => props.jumuahPrayers)
const showFocus = ref(false)
let clockInterval = null

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    isFajr: false, isDhuhr: false },
]

const { lang, dir, T, localeTag, dateLocale } = useLayoutLang(props, {
  en: { nextTitle: 'Next Prayer', remainingUntilIqamah: 'Remaining until Iqamah', islamicDate: 'Islamic Date' },
  ar: { nextTitle: 'الصلاة القادمة', remainingUntilIqamah: 'المتبقي حتى الإقامة', islamicDate: 'التاريخ الهجري' },
})

const hour12 = computed(() => props.timeFormat !== '24')
const displayTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: false })
const prayerTime = (raw, prayer) =>
  raw ? displayTime(getPrayerDateTime(raw, prayer.isFajr, prayer.isDhuhr)) : '--:--'

const prayers = computed(() =>
  PRAYERS.map(p => ({
    key:    p.key,
    name:   T.value[p.key],
    adhan:  props.prayerData ? prayerTime(props.prayerData[p.key + '_azaan'], p) : '--:--',
    iqamah: props.prayerData ? prayerTime(props.prayerData[p.key + '_iqamah'], p) : '--:--',
  }))
)

const nextPrayerName = computed(() => {
  const p = PRAYERS.find(x => x.key === props.nextPrayerKey)
  return p ? T.value[p.key] : '--'
})

const currentTime = computed(() =>
  formatClock(now.value, { hour12: hour12.value, seconds: props.showSeconds, hour: '2-digit', locale: localeTag.value })
)

const currentDate = computed(() =>
  now.value.toLocaleDateString(dateLocale.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(now.value, props.hijriOffset, lang.value))

const pad = n => String(n).padStart(2, '0')

const countdown = computed(() => {
  if (!props.nextPrayerKey || !props.prayerData) return '--:--:--'
  const prayer = PRAYERS.find(p => p.key === props.nextPrayerKey)
  if (!prayer) return '--:--:--'
  const iqamahVal = props.prayerData[prayer.key + '_iqamah']
  if (!iqamahVal) return '--:--:--'
  const iqamahTime = getNextPrayerDateTime(iqamahVal, prayer.isFajr, prayer.isDhuhr, now.value)
  const diff = iqamahTime - now.value
  if (diff <= 0) return '00:00:00'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
})

const isFriday = computed(() => now.value.getDay() === 5)

const sunriseTime = computed(() =>
  props.prayerData?.sunrise ? prayerTime(props.prayerData.sunrise, PRAYERS[0]) : '--:--'
)

const jumuahTime = computed(() =>
  props.prayerData?.dhuhr_iqamah ? prayerTime(props.prayerData.dhuhr_iqamah, PRAYERS[1]) : '--:--'
)

// ── Focus screen ────────────────────────────────────────────────────────────
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
})

/** Fajr all night; otherwise whatever is next. */
const focusScreenPrayer = computed(() => {
  const key = nightFocusActive.value ? 'fajr' : props.nextPrayerKey
  const row = prayers.value.find(p => p.key === key)
  return row ? { name: row.name, adhan: row.adhan, iqamah: row.iqamah } : null
})

/** The screen is up on the alternation, all night, and from the adhan to the iqamah. */
const focusVisible = computed(() =>
  nightFocusActive.value || awaitingIqamah.value || showFocus.value
)

// The alternation runs on the board's shared rotation clock (utils/viewRotation.js),
// so the events and Jumu'ah slides take their slot between two of these views rather
// than cutting one of them short.
watch(boardPhase, () => { showFocus.value = boardPhase.value % 2 === 1 })

// (Re)arm the focus-view toggle. focusIntervalSec <= 0 disables it.
function restartFocusInterval() {
  showFocus.value = false
  resetRotation()
}

watch(() => props.focusIntervalSec, restartFocusInterval)

onMounted(() => {
  clockInterval = setInterval(() => { now.value = debugNow() }, 1000)
  restartFocusInterval()
})

onUnmounted(() => {
  clearInterval(clockInterval)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
.l2-root {
  position: fixed; inset: 0;
  background: linear-gradient(135deg, v-bind(bgColor), v-bind(surfaceColor));
  color: v-bind(textColor);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Roboto', Arial, sans-serif;
  overflow: hidden;
  isolation: isolate;
}
.l2-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}

.l2-app {
  position: relative;
  z-index: 1;
  width: clamp(700px, 88vw, 1400px);
  height: clamp(480px, 82vh, 820px);
  display: flex;
  background: rgba(255,255,255,0.04);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0,0,0,0.5);
}

/* ── LEFT ── */
.l2-left {
  flex: 1.2;
  padding: clamp(20px, 3.5vh, 44px) clamp(20px, 2.5vw, 44px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(255,255,255,0.08);
}

.l2-time {
  font-size: clamp(2.2rem, 6.5vh, 4.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -1px;
}

.l2-date {
  color: v-bind(mutedTextColor);
  font-size: clamp(0.8rem, 1.6vh, 1.1rem);
  margin-top: 6px;
}

.l2-table-wrap { display: flex; flex-direction: column; }

.l2-table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 0 clamp(8px, 1vw, 14px);
  color: v-bind(mutedTextColor);
  font-size: clamp(0.88rem, 1.62vh, 1.15rem);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: clamp(4px, 0.6vh, 8px);
}

.l2-prayer-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: clamp(10px, 1.8vh, 18px) clamp(8px, 1vw, 14px);
  margin-top: clamp(4px, 0.7vh, 8px);
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid transparent;
  transition: background 0.3s, border-color 0.3s;
}

.l2-prayer-row.active {
  background: v-bind(accentSoft);
  border-color: v-bind(accentBorder);
}

.l2-name {
  font-size: clamp(1.35rem, 2.97vh, 2.03rem);
  font-weight: 700;
}

.l2-t {
  text-align: center;
  font-size: clamp(1.15rem, 2.43vh, 1.62rem);
  font-weight: 600;
  color: v-bind(secondaryTextColor);
}

.l2-t-adhan  { font-size: calc(clamp(1.15rem, 2.43vh, 1.62rem) * v-bind(adhanScale)); }
.l2-t-iqamah { font-size: calc(clamp(1.15rem, 2.43vh, 1.62rem) * v-bind(iqamahScale)); }

.l2-prayer-row.active .l2-name,
.l2-prayer-row.active .l2-t { color: v-bind(accentColor); }

.l2-sunrise-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  padding: clamp(6px, 1vh, 10px) clamp(8px, 1vw, 14px);
  margin-top: clamp(2px, 0.4vh, 4px);
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.15);
}

.l2-sunrise-name {
  font-size: clamp(0.9rem, 1.8vh, 1.2rem);
  font-weight: 600;
  color: v-bind(highlightTextColor);
}

.l2-sunrise-t {
  text-align: center;
  font-size: clamp(0.85rem, 1.7vh, 1.15rem);
  font-weight: 600;
  color: v-bind(highlightTextColor);
}

/* ── RIGHT ── */
.l2-right {
  flex: 1;
  padding: clamp(20px, 3.5vh, 44px) clamp(20px, 2.5vw, 44px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.l2-cards { display: flex; flex-direction: column; gap: clamp(12px, 2vh, 22px); }

.l2-card {
  border-radius: 18px;
  padding: clamp(16px, 2.5vh, 28px);
}

.l2-card-primary {
  background: v-bind(accentSoft);
  border: 1px solid v-bind(accentBorder);
}

.l2-card-secondary {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
}

.l2-mosque-logo {
  display: block;
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
  margin: 0 auto clamp(10px, 1.6vh, 16px);
}

.l2-sub {
  color: v-bind(mutedTextColor);
  font-size: clamp(0.7rem, 1.3vh, 0.95rem);
  margin-bottom: 4px;
}

.l2-next-name {
  font-size: clamp(1.6rem, 4.5vh, 3.2rem);
  font-weight: 800;
  line-height: 1.1;
}
.l2-next-name.is-jumuah { font-size: calc(clamp(1.6rem, 4.5vh, 3.2rem) * 0.55); line-height: 1.1; }

.l2-countdown {
  font-size: clamp(2rem, 5.5vh, 4rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  margin: clamp(4px, 0.8vh, 8px) 0;
  color: v-bind(accentColor);
}

.l2-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(6px, 1vh, 10px) 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.l2-info-row:first-child { padding-top: 0; }
.l2-info-row:last-child  { border-bottom: none; padding-bottom: 0; }

.l2-info-label {
  color: v-bind(mutedTextColor);
  font-size: clamp(0.75rem, 1.4vh, 1rem);
}

.l2-info-value {
  font-weight: 700;
  font-size: clamp(0.8rem, 1.5vh, 1.05rem);
}

.l2-jumuah-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(3px, 0.5vh, 6px) 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.l2-jumuah-row:last-child { border-bottom: none; }

.l2-jumuah-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 70%;
}

.l2-jumuah-label {
  font-size: clamp(0.7rem, 1.25vh, 0.9rem);
  font-weight: 600;
  color: v-bind(secondaryTextColor);
}

.l2-jumuah-speaker {
  color: v-bind(mutedTextColor);
  font-size: clamp(1rem, 1.8vh, 1.2rem);
}

.l2-jumuah-time {
  font-size: clamp(1rem, 1.25vh, 0.9rem);
  font-weight: 700;
  white-space: nowrap;
}

.l2-footer {
  font-size: clamp(0.7rem, 1.2vh, 0.9rem);
  color: v-bind(subtleTextColor);
  line-height: 1.6;
}

.l2-location {
  color: v-bind(secondaryTextColor);
  font-weight: 700;
  font-size: clamp(0.8rem, 1.4vh, 1rem);
  margin-bottom: 2px;
}

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic, which Roboto/Arial do not here. */
.l2-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Roboto', Arial, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms apart. */
[dir='rtl'] .l2-table-header,
[dir='rtl'] .l2-name,
[dir='rtl'] .l2-next-name,
[dir='rtl'] .l2-sub,
[dir='rtl'] .l2-info-label {
  letter-spacing: 0;
}
/* Times and countdowns are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .l2-countdown,
[dir='rtl'] .l2-t,
[dir='rtl'] .l2-sunrise-t,
[dir='rtl'] .l2-jumuah-time {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
