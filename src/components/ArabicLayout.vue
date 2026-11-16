<template>
  <div
    class="l1-root"
    :dir="dir"
    :class="{ dark: darkMode }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <PhotoBackdrop :image="photoImage" :repeat="photoRepeat" :text-color="textColor" />
    <div class="l1-display">

      <!-- Screen 1: schedule -->
      <div class="l1-screen l1-screen-schedule" :class="{ active: visibleScreen === 0 }">
        <div class="l1-s1-topbar">
          <div class="l1-s1-date-block">
            <div class="date-text">{{ currentDate }}</div>
            <div class="hijri-date" v-if="showHijri">{{ currentHijriDate }}</div>
          </div>
          <img v-if="mosqueLogoSrc" class="l1-mosque-logo" :src="mosqueLogoSrc" :alt="T.mosqueLogo" />
          <div v-else class="bismillah-bar">{{ T.bismillah }}</div>
          <div class="l1-s1-clock">
            <div class="time-big" v-html="currentTimeHtml"></div>
          </div>
        </div>
        <div class="l1-s1-divider"></div>

        <!-- Friday only: the sessions, in the open band above the hero. -->
        <div class="l1-s1-jumuah" v-if="jumuahSessions.length">
          <div class="l1-jumuah-label">{{ T.jumuah }}</div>
          <div class="l1-jumuah-list">
            <div
              v-for="s in jumuahSessions"
              :key="s.key"
              class="l1-jumuah-item"
              :class="{ current: s.isNext }"
            >
              <div class="l1-jumuah-name">{{ s.name }}</div>
              <div class="l1-jumuah-time">{{ s.time }}</div>
              <div class="l1-jumuah-speaker" v-if="s.speaker">{{ s.speaker }}</div>
            </div>
          </div>
        </div>

        <div class="l1-s1-hero" :class="{ 'has-weather': weatherCard }">
          <!-- Today / tonight / tomorrow. Pinned to the hero's trailing edge, which
               mirrors with the board's direction. -->
          <aside class="l1-wx" v-if="weatherCard">
            <div class="l1-wx-now">
              <svg class="l1-wx-ico" :class="{ 'is-sun': weatherCard.now.isSun }" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.now.icon" /></svg>
              <div>
                <div class="l1-wx-temp">{{ weatherCard.now.temp }}°</div>
                <div class="l1-wx-cond">{{ weatherCard.now.cond }}</div>
              </div>
            </div>
            <div class="l1-wx-range" v-if="weatherCard.today">
              {{ T.hi }} <span class="l1-wx-num">{{ weatherCard.today.high }}°</span> ·
              {{ T.lo }} <span class="l1-wx-num">{{ weatherCard.today.low }}°</span>
            </div>
            <div class="l1-wx-rows">
              <div class="l1-wx-row" v-if="weatherCard.tonight">
                <span class="l1-wx-when">{{ T.tonight }}</span>
                <svg class="l1-wx-rowico" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.tonight.icon" /></svg>
                <span class="l1-wx-rowtemp">{{ weatherCard.tonight.temp }}°</span>
              </div>
              <div class="l1-wx-row" v-if="weatherCard.tomorrow">
                <span class="l1-wx-when">{{ T.tomorrow }}</span>
                <svg class="l1-wx-rowico" :class="{ 'is-sun': weatherCard.tomorrow.isSun }" viewBox="0 0 24 24" aria-hidden="true"><path :d="weatherCard.tomorrow.icon" /></svg>
                <span class="l1-wx-rowtemp">{{ weatherCard.tomorrow.high }}°<small>/{{ weatherCard.tomorrow.low }}°</small></span>
              </div>
            </div>
          </aside>
          <div class="hero-main-row">
            <div class="times-row">
              <div class="time-item">
                <div class="t-label">{{ T.adhan }}</div>
                <div class="t-value">{{ nextPrayer ? fmtPrayerTime(nextPrayer.adhanH, nextPrayer.adhanM) : '' }}</div>
              </div>
              <div class="t-separator"></div>
              <div class="time-item">
                <div class="t-label">{{ T.iqamah }}</div>
                <div class="t-value iqamah">{{ nextPrayer ? fmtPrayerTime(nextPrayer.iqamahH, nextPrayer.iqamahM) : '' }}</div>
              </div>
            </div>
            <div class="prayer-name-block">
              <div class="prayer-name" :class="{ 'is-jumuah': nextPrayer?.isJumuah }">{{ nextPrayer?.name }}</div>
            </div>
          </div>
        </div>
        <div class="l1-s1-grid">
          <div
            v-for="p in gridPrayers"
            :key="p.nameKey"
            class="prayer-col"
            :class="{ current: p.rowKey ? nextPrayer?.rowKey === p.rowKey : nextPrayer?.nameKey === p.nameKey }"
          >
            <div class="p-name">{{ p.name }}</div>
            <div class="p-adhan">{{ fmtPrayerTime(p.adhanH, p.adhanM) }}</div>
            <div class="p-iq-label">{{ T.iqamah }}</div>
            <div class="p-iqamah">{{ fmtPrayerTime(p.iqamahH, p.iqamahM) }}</div>
          </div>
        </div>
        <div class="l1-progress-bar" ref="pb1"></div>
      </div>



    </div>

    <!-- Screen 2: the shared focus screen (FocusScreen.vue), alternating with the
         schedule and holding all night pinned to Fajr. -->
    <FocusScreen
      :active="visibleScreen === 1"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { boardPhase, slideDue, resetRotation, restartRotationDwell } from '../utils/viewRotation.js'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import PhotoBackdrop from './PhotoBackdrop.vue'
import FocusScreen from './FocusScreen.vue'
import { useFocusScreen } from '../utils/focusScreen.js'
import { formatHijri, getPrayerDateTime, getNextPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahAt, nextJumuahIndex } from '../utils/jumuah.js'
import { hexToRgb, mixHex, resolveThemedColor, toRgba } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { useWeather, describeWeather } from '../utils/weather.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  // Optional background photo — see PhotoBackdrop.vue. '' keeps the color background.
  photoImage:   { type: String, default: '' },
  photoRepeat:  { type: [Boolean, String], default: false },
  prayerData: Object,
  todayPrayerData: Object,
  baseDate:      { type: Date, default: () => new Date() },
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
  nextPrayerKey: String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // 'en' | 'ar' — flips every label and the text direction. This layout is drawn
  // Arabic-first, so English mirrors it rather than the other way round.
  lang:          { type: String, default: 'ar' },
  // Native-configurable colors (Android toolbar). Reactive → live updates.
  textColor:    { type: String, default: '#F1F5F9' },
  accentColor:  { type: String, default: '#2DD4BF' },
  bgColor:      { type: String, default: '#0B1426' },
  surfaceColor: { type: String, default: '#0F1D35' },
  // Font-size scale factors for the adhan / iqamah times (1 = default).
  adhanScale:  { type: String, default: '1' },
  iqamahScale: { type: String, default: '1' },
  // Seconds between the schedule ↔ focus screen toggle. 0 (or less) keeps the
  // schedule screen up permanently.
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
  en: {
    bismillah: 'Bismillāh ir-Raḥmān ir-Raḥīm',
    iqamahInLine: 'Iqamah in', khutbahInLine: 'Khutbah in', now: 'Now',
    hourShort: 'hr', minuteShort: 'min', minutes: 'minutes',
    hi: 'H', lo: 'L', tonight: 'Tonight', tomorrow: 'Tomorrow',
  },
  ar: {
    bismillah: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    hi: 'ع', lo: 'ص', tonight: 'الليلة', tomorrow: 'غداً',
    iqamahInLine: 'الإقامة خلال', khutbahInLine: 'تبدأ الخطبة خلال', now: 'الآن',
    hourShort: 'س', minuteShort: 'د', minutes: 'دقيقة',
  },
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
// The two screens paint the full viewport, so a background photo only shows if
// they step back: the ground goes fully transparent and the panel keeps a light
// tint of its surface color. PhotoBackdrop's scrim carries the contrast.
const hasPhoto = computed(() => !!String(props.photoImage || '').trim())
/** The weather block is a widget, not part of the board's flow, so it keeps a visible
 *  hairline and a tinted panel in both modes. */
const wxEdge = computed(() => toRgba(resolvedText.value, 0.22))
const wxBg   = computed(() => toRgba(resolvedSurface.value, hasPhoto.value ? 0.72 : 0.5))
const groundBg = computed(() => hasPhoto.value ? 'transparent' : resolvedBg.value)
const panelBg  = computed(() => hasPhoto.value ? toRgba(resolvedSurface.value, 0.35) : resolvedSurface.value)

const resolvedAmber = computed(() =>
  props.darkMode ? resolveThemedColor('#FCD34D', 'accent', true) : '#FCD34D'
)
const accentRgb = computed(() => {
  const { r, g, b } = hexToRgb(resolvedAccent.value)
  return `${r}, ${g}, ${b}`
})
const accentDim = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.4 : 0.55})`)
const accentPale = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.18 : 0.12})`)
const accentColBorder = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.14 : 0.1})`)
const dividerCol = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.22 : 0.18})`)
const textMuted = computed(() => {
  const { r, g, b } = hexToRgb(resolvedText.value)
  return `rgba(${r}, ${g}, ${b}, ${props.darkMode ? 0.72 : 0.82})`
})
const resolvedIqLabel = computed(() =>
  props.darkMode ? `rgba(${accentRgb.value}, 0.55)` : '#d7d7d7'
)
const resolvedFocusRing = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.08 : 0.06})`)
const resolvedFocusRingOuter = computed(() => `rgba(${accentRgb.value}, ${props.darkMode ? 0.05 : 0.03})`)

const currentScreen  = ref(0)
const now            = ref(debugNow())
const pb1            = ref(null)
// Toggle period in ms, driven by the native focus-interval control.
const durMs = computed(() => Math.max(1, Number(props.focusIntervalSec)) * 1000)

let clockInterval = null

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

// ── Time helpers ────────────────────────────────────────────────────────────
// Digits stay Latin in both languages; only the AM/PM marker is localized.
const toAr = n => String(n)
const hour12 = computed(() => props.timeFormat !== '24')
const periodMarker = h => (lang.value === 'ar' ? (h >= 12 ? 'م' : 'ص') : (h >= 12 ? 'PM' : 'AM'))
const fmtTimeParts = (h, m, seconds = false, s = 0, showPeriod = true) => {
  const min = String(m).padStart(2, '0')
  const sec = seconds ? `:${String(s).padStart(2, '0')}` : ''
  if (!hour12.value) return `${toAr(String(h).padStart(2, '0'))}:${toAr(min)}${toAr(sec)}`
  return `${toAr(h % 12 || 12)}:${toAr(min)}${toAr(sec)}${showPeriod ? ` ${periodMarker(h)}` : ''}`
}
const fmtPrayerTime = (h, m) => fmtTimeParts(h, m, false, 0, false)
const fmtClockTime = d => {
  return fmtTimeParts(d.getHours(), d.getMinutes(), props.showSeconds, d.getSeconds())
}

// ── Computed ────────────────────────────────────────────────────────────────
/** The five daily prayers — and the five columns of the bottom grid. */
const gridPrayers = computed(() => {
  if (!props.prayerData) return [
    { key: 'fajr',    name: T.value.fajr,  nameKey: 'FAJR',    adhanH: 4,  adhanM: 32, iqamahH: 5,  iqamahM: 0,  isFajr: true,  isDhuhr: false, iqamahKey: 'fajr_iqamah'    },
    { key: 'dhuhr',   name: T.value.dhuhr,  nameKey: 'DHUHR',   adhanH: 13, adhanM: 8,  iqamahH: 13, iqamahM: 30, isFajr: false, isDhuhr: true,  iqamahKey: 'dhuhr_iqamah'   },
    { key: 'asr',     name: T.value.asr,  nameKey: 'ASR',     adhanH: 18, adhanM: 5,  iqamahH: 18, iqamahM: 15, isFajr: false, isDhuhr: false, iqamahKey: 'asr_iqamah'     },
    { key: 'maghrib', name: T.value.maghrib, nameKey: 'MAGHRIB', adhanH: 20, adhanM: 16, iqamahH: 20, iqamahM: 21, isFajr: false, isDhuhr: false, iqamahKey: 'maghrib_iqamah' },
    { key: 'isha',    name: T.value.isha, nameKey: 'ISHA',    adhanH: 21, adhanM: 38, iqamahH: 22, iqamahM: 0,  isFajr: false, isDhuhr: false, iqamahKey: 'isha_iqamah'    },
  ]
  const parse = (azaanKey, iqamahKey, isFajr, isDhuhr) => {
    const ad = getPrayerDateTime(props.prayerData[azaanKey],  isFajr, isDhuhr)
    const iq = getPrayerDateTime(props.prayerData[iqamahKey], isFajr, isDhuhr)
    return { adhanH: ad.getHours(), adhanM: ad.getMinutes(), iqamahH: iq.getHours(), iqamahM: iq.getMinutes() }
  }
  const rows = [
    { key: 'fajr',    name: T.value.fajr,  nameKey: 'FAJR',    isFajr: true,  isDhuhr: false, iqamahKey: 'fajr_iqamah',    ...parse('fajr_azaan',    'fajr_iqamah',    true,  false) },
    { key: 'dhuhr',   name: T.value.dhuhr,  nameKey: 'DHUHR',   isFajr: false, isDhuhr: true,  iqamahKey: 'dhuhr_iqamah',   ...parse('dhuhr_azaan',   'dhuhr_iqamah',   false, true)  },
    { key: 'asr',     name: T.value.asr,  nameKey: 'ASR',     isFajr: false, isDhuhr: false, iqamahKey: 'asr_iqamah',     ...parse('asr_azaan',     'asr_iqamah',     false, false) },
    { key: 'maghrib', name: T.value.maghrib, nameKey: 'MAGHRIB', isFajr: false, isDhuhr: false, iqamahKey: 'maghrib_iqamah', ...parse('maghrib_azaan', 'maghrib_iqamah', false, false) },
    { key: 'isha',    name: T.value.isha, nameKey: 'ISHA',    isFajr: false, isDhuhr: false, iqamahKey: 'isha_iqamah',    ...parse('isha_azaan',    'isha_iqamah',    false, false) },
  ]
  return rows
})

/** The same list with Friday's Dhuhr row expanded into one row per session, carrying
 *  hour/minute numbers rather than formatted strings so the session time splits the
 *  same way. The hero and the focus screen read from this — whatever the grid shows,
 *  the headline on a Friday has to be the session that is actually next.
 *
 *  The grid itself does not: it is five fixed columns, and a mosque with three or four
 *  sessions pushed seven or eight into it, wrapping the extras onto a second row that
 *  sat on top of the hero. They go in the strip above the hero instead. */
const l1Prayers = computed(() =>
  withJumuahRows(gridPrayers.value, props.jumuahPrayers, (dhuhr, s, i) => {
    const at = jumuahDate(s.time, now.value)
    return {
      ...dhuhr,
      rowKey:  `jumuah-${i}`,
      name:    jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
      nameKey: 'JUMUAH',
      iqamahH: at.getHours(),
      iqamahM: at.getMinutes(),
      speaker: s.speaker || '',
    }
  }, now.value)
)

/** Friday's sessions for that strip. Empty on any other day. */
const jumuahSessions = computed(() => {
  const list = props.jumuahPrayers || []
  const nextIdx = nextJumuahIndex(list, now.value)
  return list.map((s, i) => {
    const at = jumuahDate(s.time, now.value)
    return {
      key:     `jumuah-${i}`,
      name:    jumuahName(s, { lang: lang.value, index: i, count: list.length, label: T.value.jumuah }),
      time:    fmtPrayerTime(at.getHours(), at.getMinutes()),
      speaker: s.speaker || '',
      isNext:  i === nextIdx,
    }
  })
})

const nextPrayer = computed(() => {
  const nowMin = now.value.getHours() * 60 + now.value.getMinutes()
  if (props.nextPrayerKey) {
    // On Friday the Dhuhr key maps onto one row per Jumu'ah session.
    const matches = l1Prayers.value.filter(p => p.key === props.nextPrayerKey)
    if (matches.length) {
      return matches.find(p => (p.iqamahH * 60 + p.iqamahM) > nowMin) || matches[matches.length - 1]
    }
  }
  return l1Prayers.value.find(p => (p.iqamahH * 60 + p.iqamahM) > nowMin) || l1Prayers.value[0]
})

const currentTimeHtml = computed(() => {
  return fmtClockTime(now.value).replace(/ (ص|م|AM|PM)$/, '<span class="ampm"> $1</span>')
})

const currentDate = computed(() =>
  now.value.toLocaleDateString(lang.value === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
)

const currentHijriDate = computed(() =>
  formatHijri(now.value, props.hijriOffset, lang.value === 'ar' ? 'ar-SA' : 'en')
)

const countdownText = computed(() => {
  if (!nextPrayer.value) return ''
  let diff
  if (props.prayerData && nextPrayer.value.iqamahKey) {
    // A Jumu'ah session counts down to its khutbah; Dhuhr's iqamah may be long past.
    const khutbah = nextPrayer.value.isJumuah ? nextJumuahAt(props.jumuahPrayers, now.value) : null
    const target = khutbah || getNextPrayerDateTime(
      props.prayerData[nextPrayer.value.iqamahKey],
      nextPrayer.value.isFajr,
      nextPrayer.value.isDhuhr,
      now.value
    )
    diff = Math.ceil((target - now.value) / 60000)
  } else {
    const nowMin = now.value.getHours() * 60 + now.value.getMinutes()
    diff = (nextPrayer.value.iqamahH * 60 + nextPrayer.value.iqamahM) - nowMin
    if (diff < 0) diff += 24 * 60
  }
  if (diff === 0) return T.value.now
  const h = Math.floor(diff / 60), m = diff % 60
  return h > 0
    ? `${toAr(h)} ${T.value.hourShort} ${toAr(m)} ${T.value.minuteShort}`
    : `${toAr(m)} ${T.value.minutes}`
})

// ── Progress bar animation ───────────────────────────────────────────────────
function animPb(el, dur) {
  if (!el) return
  el.style.transition = 'none'
  el.style.width = '0%'
  setTimeout(() => {
    el.style.transition = `width ${dur}ms linear`
    el.style.width = '100%'
  }, 50)
}

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
  focusIsJumuah:          () => !!focusPrayer.value?.isJumuah,
})

const manualScreen = ref(null)   // null = automatic, else 0 (schedule) | 1 (focus)
const visibleScreen = computed(() => {
  if (manualScreen.value !== null) return manualScreen.value
  // awaitingIqamah holds the screen from the adhan to the iqamah.
  return (nightFocusActive.value || awaitingIqamah.value) ? 1 : currentScreen.value
})
/** Fajr all night; otherwise whatever is next. */
const focusPrayer = computed(() =>
  nightFocusActive.value
    ? (l1Prayers.value.find(p => p.key === 'fajr') || nextPrayer.value)
    : nextPrayer.value
)
/** The shared screen takes formatted times; this layout carries hours and minutes. */
const focusScreenPrayer = computed(() => {
  const p = focusPrayer.value
  if (!p) return null
  return {
    name:     p.name,
    adhan:    fmtPrayerTime(p.adhanH, p.adhanM),
    iqamah:   fmtPrayerTime(p.iqamahH, p.iqamahM),
    speaker:  p.speaker || '',
    isJumuah: !!p.isJumuah,
  }
})

// ── Swipe to switch screens ─────────────────────────────────────────────────
const SWIPE_MIN_PX = 60
const SWIPE_MAX_MS = 1500        // generous: slow panels add dispatch latency
const swipeStart = ref(null)

function toggleView() {
  manualScreen.value = visibleScreen.value === 1 ? 0 : 1
  currentScreen.value = manualScreen.value
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
watch(nightFocusActive, () => { manualScreen.value = null })
watch(awaitingIqamah,   () => { manualScreen.value = null })

/** The screens alternate on the board's shared rotation clock
 *  (utils/viewRotation.js) — the same clock the events and Jumu'ah slides take their
 *  slot from, so a slide can only arrive once the screen that is up has had its
 *  whole dwell. */
function switchScreen() {
  // A manual swipe is handed back to the clock during the day; at night nothing
  // alternates, so the swipe stands until the next one.
  if (!nightFocusActive.value && !awaitingIqamah.value) manualScreen.value = null
  currentScreen.value = boardPhase.value % 2 === 0 ? 0 : 1
  animPb(pb1.value, durMs.value)
}
watch(boardPhase, switchScreen)
// The slide's slot runs the bar out while the board is covered; start it over when
// the board comes back so it still reads as this screen's own dwell.
watch(slideDue, due => { if (!due) animPb(pb1.value, durMs.value) })

// (Re)arm the screen toggle. focusIntervalSec <= 0 disables it and pins screen 0.
function restartFocusInterval(resetView = true) {
  if (resetView) {
    currentScreen.value = 0
    resetRotation()
  } else {
    restartRotationDwell(currentScreen.value === 1)
  }
  const sec = Number(props.focusIntervalSec)
  if (sec > 0) animPb(pb1.value, sec * 1000)
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
.l1-root {
  --accent:      v-bind(resolvedAccent);
  --accent-dim:  v-bind(accentDim);
  --accent-pale: v-bind(accentPale);
  --amber:       v-bind(resolvedAmber);
  --text:        v-bind(resolvedText);
  --text-muted:  v-bind(textMuted);
  --bg:          v-bind(groundBg);
  --bg-s1:       v-bind(panelBg);
  --bg-s2:       v-bind(groundBg);
  --divider:     v-bind(dividerCol);
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg);
  overflow: hidden;
  direction: rtl;
  font-family: 'Tajawal', sans-serif;
  isolation: isolate;
}
.l1-root::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 50;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}
.l1-root *, .l1-root *::before, .l1-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}
.l1-display { width: 100vw; height: 100vh; position: relative; z-index: 100; }

.l1-screen {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0; transition: opacity 0.9s ease; pointer-events: none;
}
.l1-screen.active { opacity: 1; pointer-events: all; }

/* ── Screen 1: schedule ─────────────────────── */
.l1-screen-schedule {
  background: var(--bg-s1); display: flex; flex-direction: column;
  padding-bottom: clamp(160px, 22vh, 210px);
}
.l1-s1-topbar { display: flex; justify-content: space-between; align-items: flex-start; padding: clamp(20px, 3.5vh, 42px) clamp(40px, 5vw, 72px) 0; }
.l1-s1-clock { text-align: right; }
.l1-s1-clock .time-big {
  font-family: 'Tajawal', sans-serif; font-size: clamp(40px, 7vh, 70px); font-weight: 700;
  color: var(--text); line-height: 1; letter-spacing: 0.01em;
}
.l1-s1-clock :deep(.ampm) { font-family: 'Tajawal', sans-serif; font-size: clamp(27px, 4.2vh, 40px); font-weight: 400; color: var(--accent); margin-right: 6px; }
.l1-s1-date-block { text-align: left; }
.l1-s1-date-block .l1-label {
  font-family: 'Tajawal', sans-serif; font-size: clamp(16px, 2.2vh, 22px); font-weight: 600;
  letter-spacing: 0.06em; color: var(--accent); margin-bottom: 4px; text-align: right;
}
.l1-s1-date-block .date-text { font-family: 'Tajawal', sans-serif; font-size: clamp(22px, 3.5vh, 38px); font-weight: 400; color: var(--text); }
.hijri-date { font-family: 'Tajawal', sans-serif; font-size: clamp(17px, 2.4vh, 30px); font-weight: 500; color: var(--accent); margin-top: 4px; text-align: right; }
.l1-s1-divider {
  margin: clamp(8px, 1.4vh, 14px) 14px; height: 1px;
  background: linear-gradient(to left, transparent, var(--accent-dim), transparent);
  opacity: 0.5;
}
/* ── Friday sessions ─────────────────────────────
   A strip in the band between the divider and the hero: on this board that space is
   empty, and the bottom grid is a fixed five columns wide. */
.l1-s1-jumuah {
  display: flex; align-items: center; justify-content: center;
  gap: clamp(12px, 2vw, 32px);
  padding: clamp(4px, 0.8vh, 12px) clamp(16px, 3vw, 48px);
  flex-wrap: wrap;
}
.l1-jumuah-label {
  font-family: 'Tajawal', sans-serif;
  font-size: clamp(16px, 2.2vh, 26px); font-weight: 600;
  color: var(--accent); letter-spacing: 0.12em;
}
.l1-jumuah-list { display: flex; align-items: stretch; gap: clamp(8px, 1.4vw, 22px); flex-wrap: wrap; justify-content: center; }
.l1-jumuah-item {
  min-width: clamp(96px, 11vw, 160px);
  padding: clamp(4px, 0.7vh, 10px) clamp(8px, 1.1vw, 18px);
  border: 1px solid var(--accent-dim); border-radius: 10px;
  background: var(--bg-s1); text-align: center;
}
.l1-jumuah-item.current { border-color: var(--accent); background: var(--accent-pale); }
.l1-jumuah-name {
  font-family: 'Tajawal', sans-serif;
  font-size: clamp(15px, 2vh, 24px); font-weight: 600; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: clamp(130px, 15vw, 230px);
}
.l1-jumuah-item.current .l1-jumuah-name { color: var(--accent); }
.l1-jumuah-time {
  font-family: 'Tajawal', sans-serif; direction: ltr;
  font-size: clamp(26px, 4vh, 44px); font-weight: 700; color: var(--accent); line-height: 1.1;
}
.l1-jumuah-item.current .l1-jumuah-time { color: var(--amber); }
.l1-jumuah-speaker {
  font-size: clamp(12px, 1.6vh, 18px); color: var(--text-muted); opacity: 0.8;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: clamp(130px, 15vw, 230px);
}

.l1-s1-hero {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 0 clamp(24px, 4vw, 52px);
  margin-top: -5%;
  position: relative;
}
/* With the widget up the headline steps away from it rather than staying centred
   between two bands — the board is drawn RTL, so it leans the other way in English. */
.l1-s1-hero.has-weather { padding-left: min(27vw, 350px); }
.l1-root[dir='ltr'] .l1-s1-hero.has-weather {
  padding-left: clamp(24px, 4vw, 52px);
  padding-right: min(27vw, 350px);
}

/* ── Weather widget ──────────────────────────────
   Pinned to the hero's trailing edge, mirrored with the board's direction. */
.l1-wx {
  position: absolute;
  left: clamp(16px, 2.2vw, 40px);
  top: 50%;
  transform: translateY(-50%);
  width: min(24vw, 320px);
  padding: clamp(12px, 1.8vh, 26px) clamp(14px, 1.7vw, 30px);
  border: 1px solid v-bind(wxEdge);
  border-radius: clamp(16px, 1.7vw, 28px);
  background: v-bind(wxBg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  color: var(--text);
}
.l1-root[dir='ltr'] .l1-wx { left: auto; right: clamp(16px, 2.2vw, 40px); }
.l1-wx-now { display: flex; align-items: center; gap: clamp(8px, 1vw, 16px); }
.l1-wx-ico {
  width: clamp(38px, 4.4vw, 76px); height: clamp(38px, 4.4vw, 76px);
  flex: none; fill: var(--text); opacity: 0.9;
}
/* Only a clear sky takes the accent; a gold raindrop reads as wrong. */
.l1-wx-ico.is-sun, .l1-wx-rowico.is-sun { fill: var(--amber); opacity: 1; }
.l1-wx-temp {
  font-family: 'Tajawal', sans-serif;
  font-size: clamp(30px, 3.6vw, 62px); font-weight: 700; line-height: 1;
  direction: ltr; unicode-bidi: isolate;
}
.l1-wx-cond {
  font-size: clamp(12px, min(1.15vw, 1.8vh), 19px);
  text-transform: uppercase; letter-spacing: 2px;
  color: var(--accent); margin-top: clamp(2px, 0.4vh, 6px);
}
.l1-wx-range {
  font-size: clamp(12px, min(1.2vw, 1.9vh), 20px); font-weight: 600;
  color: var(--text-muted); margin-top: clamp(4px, 0.7vh, 10px);
  font-variant-numeric: tabular-nums;
}
.l1-wx-rows {
  margin-top: clamp(8px, 1.2vh, 16px);
  padding-top: clamp(6px, 1vh, 12px);
  border-top: 1px solid var(--divider);
  display: flex; flex-direction: column; gap: clamp(4px, 0.7vh, 10px);
}
.l1-wx-row { display: flex; align-items: center; gap: clamp(6px, 0.8vw, 12px); }
.l1-wx-when {
  flex: 1; font-size: clamp(11px, min(1.05vw, 1.7vh), 17px);
  text-transform: uppercase; letter-spacing: 2px; color: var(--text-muted);
}
.l1-wx-rowico {
  width: clamp(18px, 1.9vw, 32px); height: clamp(18px, 1.9vw, 32px);
  flex: none; fill: var(--text); opacity: 0.85;
}
.l1-wx-rowtemp {
  font-family: 'Tajawal', sans-serif;
  font-size: clamp(16px, 1.7vw, 30px); font-weight: 700;
  font-variant-numeric: tabular-nums;
  direction: ltr; unicode-bidi: isolate;
}
.l1-wx-num { direction: ltr; unicode-bidi: isolate; }
.l1-wx-rowtemp small { font-size: 0.72em; font-weight: 500; opacity: 0.6; }
.l1-s1-hero .hero-main-row { display: flex; flex-direction: row; align-items: center; justify-content: center; gap: clamp(32px, 5vw, 80px); direction: ltr; }
.l1-s1-hero .prayer-name-block { display: flex; flex-direction: column; align-items: center; }
.l1-s1-hero .prayer-name {
  font-family: 'Tajawal', sans-serif; font-size: clamp(88px, 16vh, 178px);
  font-weight: 700; color: var(--text); line-height: 0.9;
}
/* A session carries its venue in its name — "Jummah 2 - Rosewood Center" is four
   times the length of "Dhuhr" and filled the whole board at the headline size. The
   focus screen already does this. */
.l1-s1-hero .prayer-name.is-jumuah {
  font-size: calc(clamp(88px, 16vh, 178px) * 0.42);
  line-height: 1.08;
  max-width: clamp(220px, 32vw, 460px);
}
.l1-s1-hero .times-row { display: flex; gap: clamp(24px, 4vw, 64px); align-items: baseline; flex-direction: row-reverse; }
.l1-s1-hero .time-item { text-align: center; }
.l1-s1-hero .time-item .t-label { font-size: clamp(20px, 2.75vh, 33px); font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
.l1-s1-hero .time-item .t-value { font-family: 'Tajawal', sans-serif; font-size: calc(clamp(88px, 16vh, 178px) * v-bind(adhanScale)); font-weight: 700; color: var(--text); line-height: 1; direction: ltr; }
.l1-s1-hero .time-item .t-value.iqamah { color: var(--amber); font-size: calc(clamp(88px, 16vh, 178px) * v-bind(iqamahScale)); }
.t-separator { width: 1px; height: clamp(20px, 3.5vh, 36px); background: var(--divider); align-self: center; }

/* ── Prayer grid ─────────────────────────────── */
.l1-s1-grid {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: grid; grid-template-columns: repeat(5,1fr);
  border-top: 1px solid var(--divider); direction: rtl;
}
.prayer-col {
  border-top: 1px solid var(--accent-dim);
  padding: clamp(10px, 1.8vh, 18px) 0; text-align: center;
  border-left: 1px solid v-bind(accentColBorder); transition: background 0.3s;
  background: var(--bg-s1);
}
.prayer-col:last-child { border-left: none; }
.prayer-col.current {
  background: var(--accent-pale);
  border-top: 2px solid var(--accent);
}
.prayer-col .p-name { font-family: 'Tajawal', sans-serif; font-size: clamp(23px, 3.3vh, 33px); font-weight: 700; color: var(--text-muted); margin-bottom: clamp(4px, 0.8vh, 8px); }
.prayer-col.current .p-name { color: var(--accent); }
.prayer-col .p-adhan { font-family: 'Tajawal', sans-serif; font-size: calc(clamp(36px, 6.5vh, 62px) * v-bind(adhanScale)); font-weight: 700; color: var(--text); line-height: 1; margin-bottom: clamp(2px, 0.4vh, 4px); }
.prayer-col .p-iq-label { color: v-bind(resolvedIqLabel); margin-bottom: 2px; font-size: clamp(18px, 2.1vh, 22px); font-weight: 600; position: relative; top: 5px; }
.prayer-col .p-iqamah { font-family: 'Tajawal', sans-serif; font-size: calc(clamp(38px, 6.9vh, 65px) * v-bind(iqamahScale)); font-weight: 700; color: var(--accent); }
.prayer-col.current .p-iqamah { color: var(--amber); }

.bismillah-bar {
  position: absolute; top: 0; left: 0; right: 0; text-align: center;
  padding: clamp(6px, 0.8vh, 10px) 0; font-family: 'Tajawal', sans-serif; font-size: clamp(24px, 3.3vh, 37px);
  color: var(--accent); letter-spacing: 0.08em;
}
.l1-s1-topbar .bismillah-bar {
  position: static; flex: 1; align-self: center; text-align: center;
}
/* Sized by the board's Logo Size control; without this it renders at its natural
   pixel width, which on a 4K-ish asset fills the topbar. */
.l1-mosque-logo {
  flex: 0 0 auto;
  align-self: center;
  width: v-bind(mosqueLogoWidth);
  height: auto;
  object-fit: contain;
}

.l1-root { touch-action: none; }   /* let horizontal swipes reach the handlers */

/* ── English ─────────────────────────────────────────────────────────────────
   This layout is drawn Arabic-first: `direction: rtl` is baked into the root and
   into a few inner rows, and the hero reverses its own flex axis on top of that.
   English mirrors the whole thing back rather than being a separate design. */
.l1-root[dir='ltr'],
.l1-root[dir='ltr'] .l1-s1-grid {
  direction: ltr;
}
/* Tajawal is an Arabic face; Latin text belongs in the house sans. The v-html
   clock marker sits outside the scoped tree, hence the :deep() arm. */
.l1-root[dir='ltr'],
.l1-root[dir='ltr'] *,
.l1-root[dir='ltr'] :deep(.ampm) {
  font-family: 'Inter', sans-serif;
}
/* Hero: times sit beside the prayer name, so both axes flip for English —
   name first, then Adhan before Iqamah. */
.l1-root[dir='ltr'] .l1-s1-hero .hero-main-row { flex-direction: row-reverse; }
.l1-root[dir='ltr'] .l1-s1-hero .times-row     { flex-direction: row; }
/* The topbar leans its two outer blocks inward; which side that is swaps. */
.l1-root[dir='ltr'] .l1-s1-clock,
.l1-root[dir='ltr'] .hijri-date,
.l1-root[dir='ltr'] .l1-s1-date-block .l1-label { text-align: left; }
.l1-root[dir='ltr'] .l1-s1-date-block { text-align: right; }
/* Gaps that were opened on the marker's Arabic side. */
.l1-root[dir='ltr'] .l1-s1-clock :deep(.ampm) { margin-right: 0; margin-left: 6px; }
.l1-root[dir='ltr'] .l1-s1-divider {
  background: linear-gradient(to right, transparent, var(--accent-dim), transparent);
}
.l1-root[dir='ltr'] .l1-progress-bar { right: auto; left: 0; }
/* The hero/column times are bare Latin numerals either way. */
.l1-root[dir='ltr'] .l1-s1-hero .time-item .t-value { direction: ltr; }
</style>
