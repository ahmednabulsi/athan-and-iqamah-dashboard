<!--
  Layout 11 — Prayer Frame.

  A port of the 1280 x 800 Material 3 "Athan & Iqamah" frame design (prayer-frame-html)
  into the dashboard. Unlike the other layouts this one is not a single screen: it is a
  small state machine that swaps between five screens on one stage.

      adhan    while the adhan audio is playing (and briefly at adhan time when the
               sound is muted/disabled), with a speaker button to mute it
      final    the last minute before an adhan — countdown ring
      night    from Isha iqamah + 20 min until Fajr adhan — black screen, dim clock
      main     the focus view: one big next-prayer card (skipped when focus is off)
      schedule the default: all five prayers as tiles

  Priority runs top to bottom, so the adhan screen beats the final minute, which beats
  night, and schedule/main alternate every focusIntervalSec seconds underneath.

  Everything is laid out at absolute 1280 x 800 (as designed) on a stage that is scaled
  to fit the panel; the photo behind it fills the whole viewport so there are no bars.
-->
<template>
  <div
    class="l11-root"
    :class="rootClass"
    :style="rootStyle"
    :dir="dir"
    :lang="lang"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >

    <!-- ── Background: fills the viewport, not just the 1280x800 stage ── -->
    <div class="l11-ground"></div>
    <div
      v-if="screen !== 'night'"
      class="l11-bg night-dim"
      :class="{ 'night-tone': screen === 'adhan' || screen === 'final' }"
      :style="bgStyle"
    ></div>
    <div v-if="backdropLayer" class="l11-backdrop" :style="backdropLayer"></div>

    <!-- ── Stage: the design's own 1280 x 800 coordinate space ── -->
    <div class="l11-stage" :style="stageStyle">

      <!-- ══════════ SCHEDULE / MAIN share the clock, weather and footer ══════════ -->
      <template v-if="screen === 'schedule' || screen === 'main'">
        <header class="clock">
          <div class="time">{{ clockText }}</div>   <!-- not .num: RTL must place ص/م left of the digits -->
          <div class="date">
            <span :class="{ on: dateIndex === 0 }">{{ gregorianDate }}</span>
            <span v-if="hijriDate" :class="{ on: dateIndex === 1 }">{{ hijriDate }}</span>
          </div>
        </header>

        <section v-if="weather" class="weather">
          <div class="now">
            <svg class="ico" :class="{ 'is-sunny': weather.isSun }" width="48" height="48" viewBox="0 0 24 24" aria-hidden="true"><path :d="weather.icon" /></svg>
            <span class="deg num">{{ weather.temp }}°</span>
            <span class="cond">{{ weather.cond }}</span>
          </div>
          <div class="range">
            {{ T.hi }} <span class="num">{{ weather.high }}°</span> ·
            {{ T.lo }} <span class="num">{{ weather.low }}°</span>
          </div>
        </section>
        <!-- With no weather feed the top corner would sit empty, so the mosque logo
             (when there is one) takes the slot instead of leaving a hole. -->
        <img v-else-if="mosqueLogoSrc" class="l11-logo" :src="mosqueLogoSrc" alt="" />

        <!-- ── Schedule: five tiles ── -->
        <section v-if="screen === 'schedule'" class="tiles">
          <article
            v-for="p in prayerRows"
            :key="p.rowKey || p.key"
            class="card tile"
            :class="{ on: p.isNext }"
          >
            <div>
              <div class="pname">{{ p.name }}</div>
              <div v-if="p.speaker" class="tkhateeb">{{ p.speaker }}</div>
              <div class="adhan num">{{ p.adhan }}</div>
            </div>
            <hr>
            <div>
              <div class="sub">{{ T.iqamah }}</div>
              <div class="iqt num">{{ p.iqamah }}</div>
            </div>
          </article>
        </section>

        <!-- ── Main (focus): one next-prayer card ── -->
        <section v-else-if="nextRow" class="card on next">
          <div class="row">
            <span class="name">{{ nextRow.name }}</span>
            <span v-if="!nextRow.isJumuah" class="name num">{{ nextRow.adhan }}</span>
          </div>
          <div v-if="nextRow.speaker" class="khateeb">{{ nextRow.speaker }}</div>
          <div class="when">{{ nextInText }}</div>
          <hr>
          <div class="row iq">
            <span>{{ nextRow.isJumuah ? T.khutbahStartsAt : T.iqamah }}</span>
            <span class="num">{{ nextRow.iqamah }}</span>
          </div>
        </section>

        <p v-if="showSunrise && sunriseText" class="sun" :class="{ end: screen === 'main' }">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICON.sunrise" /></svg>
          <span>{{ T.sunrise }} <span class="num">{{ sunriseText }}</span></span>
        </p>
        <p v-if="showMosque && mosqueName" class="place">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICON.pin" /><circle cx="12" cy="9" r="2.5" /></svg>
          <span>{{ mosqueName }}</span>
        </p>
      </template>

      <!-- ══════════ FINAL MINUTE ══════════ -->
      <template v-else-if="screen === 'final'">
        <div class="label">{{ eventLabel }}</div>
        <div class="bigname">{{ eventPrayerName }}</div>
        <div class="ring">
          <svg viewBox="-200 -200 400 400">
            <g transform="rotate(-90)">
              <circle
                class="track"
                :r="RING_R"
                :stroke-dasharray="ring.trackDash"
                :stroke-dashoffset="ring.trackOffset"
                :style="{ visibility: ring.trackVisible ? 'visible' : 'hidden' }"
              />
              <circle
                class="arc"
                :r="RING_R"
                :stroke-dasharray="ring.arcDash"
                :stroke-dashoffset="ring.arcOffset"
                :style="{ visibility: ring.arcVisible ? 'visible' : 'hidden' }"
              />
            </g>
          </svg>
          <div class="secs num" :class="`secs-${ring.seconds.length}`">{{ ring.seconds }}</div>
        </div>
      </template>

      <!-- ══════════ ADHAN ══════════ -->
      <template v-else-if="screen === 'adhan'">
        <div class="label">{{ eventLabel }}</div>
        <div class="bigname">{{ eventPrayerName }}</div>
        <div class="pill">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICON.hearing" /></svg>
          <span>{{ caption }}</span>
        </div>
        <!-- Mute: the one control on the whole display, so it gets a full 96px target -->
        <button
          v-if="isAthanPlaying"
          type="button"
          class="l11-mute"
          :class="{ muted: isAthanMuted }"
          :aria-label="isAthanMuted ? T.unmute : T.mute"
          :title="isAthanMuted ? T.unmute : T.mute"
          @click="$emit('toggle-athan-mute')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path :d="isAthanMuted ? ICON.volumeOff : ICON.volumeUp" />
          </svg>
        </button>
      </template>

      <!-- ══════════ NIGHT ══════════ -->
      <div v-else class="night-inner">
        <div class="bignum num">{{ nightClockText }}</div>
        <div class="next-line">
          {{ T.fajr }} <span class="num">{{ fajrText }}</span>
          <template v-if="showSunrise && sunriseText">
            · {{ T.sunrise }} <span class="num">{{ sunriseText }}</span>
          </template>
        </div>
      </div>

    </div><!-- /l11-stage -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { boardPhase, resetRotation, restartRotationDwell } from '../utils/viewRotation.js'
import { debugNow, clockOffsetMs, useDebugClock } from '../utils/debugClock.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahAt } from '../utils/jumuah.js'
import { darken, hexToRgb, mixHex } from '../utils/colorAdjust.js'
import { countdownKinds, countdownLeadMs, findNextEvent, countdownText }
  from '../utils/prayerCountdown.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  // Today's or (after Isha iqamah) tomorrow's times — whichever the dashboard is showing.
  prayerData:      Object,
  // Always today's slice. Needed because the night window starts from *today's*
  // Isha iqamah even once the rest of the screen has rolled over to tomorrow.
  todayPrayerData: Object,
  baseDate:        { type: Date, default: () => new Date() },
  nextPrayerKey:   String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  mosqueName:      String,

  // ── Look ──────────────────────────────────────────────────────────────────
  lang:         { type: String, default: 'en' },           // 'en' | 'ar'
  accentColor:  { type: String, default: '#8fd8a8' },
  // Prayer-time size multipliers (1 = design size).
  adhanScale:   { type: String, default: '1' },
  iqamahScale:  { type: String, default: '1' },
  cardStyle:    { type: String, default: 'dark' },         // dark | light | tonal | auto
  cardOpacity:  { type: [Number, String], default: 100 },  // 0..100
  contrast:     { type: String, default: '' },             // '' | hc-white | hc-red | hc-green | hc-yellow | hc-black
  bgImage:      { type: String, default: '' },
  nightAfterIshaMin: { type: [Number, String], default: 20 },

  // ── Optional weather (only drawn when lat/lng are known) ──────────────────
  lat:          { type: [Number, String], default: null },
  lng:          { type: [Number, String], default: null },
  showWeather:  { type: Boolean, default: true },
  weatherUnit:  { type: String, default: 'f' },            // 'f' | 'c'

  // ── Screen rotation / adhan state ─────────────────────────────────────────
  focusIntervalSec: { type: Number, default: 30 },
  isAthanPlaying:   { type: Boolean, default: false },
  isAthanMuted:     { type: Boolean, default: false },
  // Countdown screen: how many minutes ahead of the event it takes over
  // ('off' disables it), and which events it runs for.
  countdownLeadMin: { type: [Number, String], default: 1 },
  countdownFor:     { type: String, default: 'athan' },    // athan | iqamah | both

  // ── Standard dashboard toggles ────────────────────────────────────────────
  timeFormat:      { type: String,  default: '12' },
  hijriOffset:     { type: Number,  default: 0 },
  showSeconds:     { type: Boolean, default: true },
  showHijri:       { type: Boolean, default: true },
  showSunrise:     { type: Boolean, default: true },
  showMosque:      { type: Boolean, default: true },
  mosqueLogoSrc:   { type: String, default: '' },
  mosqueLogoWidth: { type: String, default: clampCqi('59px', 9.1, '85px') },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

const emit = defineEmits(['toggle-athan-mute', 'stop-athan'])

// ── Material icons (24dp), inline so the frame works offline ────────────────
const ICON = {
  sunny: 'm6.76 4.84-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7 1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-1 4.95h2V19.5h-2v2.95zm-7.45-3.91 1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
  cloudy: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0 1 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0 1 22 15c0 1.65-1.35 3-3 3z',
  rainy: 'M17.66 8 12 2.35 6.34 8C4.78 9.56 4 11.64 4 13.64s.78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.64 2.34-5.64s-.78-4.11-2.34-5.67zM6 14c.01-2 .62-3.27 1.76-4.4L12 5.27l4.24 4.38C17.38 10.77 17.99 12 18 14H6z',
  snowy: 'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.21 7 11.85 7 9z',
  sunrise: 'M6 17a6 6 0 0 1 12 0h-2a4 4 0 0 0-8 0H6zM2 19h20v2H2zM11 3h2v4h-2zM4.2 9.6l1.4-1.4 2.1 2.1-1.4 1.4zM19.8 9.6l-1.4-1.4-2.1 2.1 1.4 1.4z',
  hearing: 'M17 20c-.29 0-.56-.06-.76-.15-.71-.37-1.21-.88-1.71-2.38-.51-1.56-1.47-2.29-2.39-3-.79-.61-1.61-1.24-2.32-2.53C9.29 10.98 9 9.93 9 9c0-2.8 2.2-5 5-5s5 2.2 5 5h2c0-3.93-3.07-7-7-7S7 5.07 7 9c0 1.26.38 2.65 1.07 3.9.91 1.65 1.98 2.48 2.85 3.15.81.62 1.39 1.07 1.71 2.05.6 1.82 1.37 2.84 2.73 3.55.51.23 1.07.35 1.64.35 2.21 0 4-1.79 4-4h-2c0 1.1-.9 2-2 2zM7.64 2.64 6.22 1.22C4.23 3.21 3 5.96 3 9s1.23 5.79 3.22 7.78l1.41-1.41C6.01 13.74 5 11.49 5 9s1.01-4.74 2.64-6.36zM11.5 9c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5z',
  volumeUp: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
}

const TEXT = {
  en: {
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    iqamah: 'Iqamah', jumuah: "Jumu'ah", khutbahStartsAt: 'Khutbah starts at',
    // Reads down the screen as "Time for Athan / Isha".
    timeFor: kind => `Time for ${kind === 'iqamah' ? 'Iqamah' : 'Athan'}`,
    sunrise: 'Sunrise', hi: 'H', lo: 'L',
    mute: 'Mute adhan', unmute: 'Unmute adhan',
    in: (h, m, s) => (h ? `In ${h} hr ${m} min` : m ? `In ${m} min` : `In ${s} sec`),
  },
  ar: {
    fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
    iqamah: 'الإقامة', jumuah: 'الجمعة', khutbahStartsAt: 'تبدأ الخطبة',
    timeFor: kind => `حان موعد ${kind === 'iqamah' ? 'الإقامة' : 'الأذان'}`,
    sunrise: 'الشروق', hi: 'ع', lo: 'ص',
    mute: 'كتم الأذان', unmute: 'تشغيل الأذان',
    in: (h, m, s) => (h ? `بعد ${h} س ${m} د` : m ? `بعد ${m} دقيقة` : `بعد ${s} ثانية`),
  },
}

const PRAYERS = [
  { key: 'fajr',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    isFajr: false, isDhuhr: false },
]

const CAPTION = 'الله أكبر الله أكبر'
const RING_R = 176, RING_GAP = 14, RING_SW = 14
const RING_LEN = 2 * Math.PI * RING_R
/** Grace window after an adhan time during which the adhan screen still shows even
 *  when no audio played (sound off, or alerts disabled). */
const SILENT_ADHAN_MS = 90_000

const lang = computed(() => (props.lang === 'ar' ? 'ar' : 'en'))
const dir  = computed(() => (lang.value === 'ar' ? 'rtl' : 'ltr'))
const T    = computed(() => TEXT[lang.value])
const caption = CAPTION

// ── Clocks ──────────────────────────────────────────────────────────────────
const now       = ref(debugNow())
const fineNow   = ref(Date.now() + clockOffsetMs.value)
const showFocus = ref(false)
const dateIndex = ref(0)
let clockTimer = null, dateTimer = null, ringFrame = null, weatherTimer = null

// Latin digits even in Arabic, matching the design's mock-ups.
const localeTag = computed(() => (lang.value === 'ar' ? 'ar-u-nu-latn' : 'en-US'))
// Bare times (the tiles, sunrise, the night clock) are formatted in English even in
// Arabic: stripAmPm() only knows how to remove a Latin AM/PM, so an Arabic locale
// leaves a ص/م hanging off every time and wraps the tiles onto two lines.
const bareLocale = 'en-US'
const hour12     = computed(() => props.timeFormat !== '24')

const clockText = computed(() =>
  formatClock(now.value, { hour12: hour12.value, seconds: props.showSeconds, locale: localeTag.value })
)
const nightClockText = computed(() =>
  formatClock(now.value, { hour12: hour12.value, seconds: false, period: false, locale: bareLocale })
)
const gregorianDate = computed(() =>
  now.value.toLocaleDateString(localeTag.value, { weekday: 'long', month: 'long', day: 'numeric' })
)
const hijriDate = computed(() =>
  props.showHijri ? formatHijriLocalized(now.value, props.hijriOffset, lang.value) : ''
)

// ── Prayer times ────────────────────────────────────────────────────────────
const prayerAt = (data, key, suffix, base) => {
  const meta = PRAYERS.find(p => p.key === key)
  const raw  = data?.[`${key}_${suffix}`]
  if (!raw || !meta) return null
  return getPrayerDateTime(raw, meta.isFajr, meta.isDhuhr, base || props.baseDate)
}
const fmtPrayer = d =>
  d ? formatClock(d, { hour12: hour12.value, seconds: false, period: false, locale: bareLocale }) : '—'

const prayerRows = computed(() => {
  const rows = PRAYERS.map(({ key }) => ({
    key,
    name:   T.value[key],
    adhan:  fmtPrayer(prayerAt(props.prayerData, key, 'azaan')),
    iqamah: fmtPrayer(prayerAt(props.prayerData, key, 'iqamah')),
    isNext: key === props.nextPrayerKey,
  }))
  // On Friday the Dhuhr row becomes one row per Jumu'ah session.
  return withJumuahRows(rows, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:  `jumuah-${i}`,
    name:    jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:  fmtPrayer(jumuahDate(s.time)),
    speaker: s.speaker || '',
    isNext:  dhuhr.isNext && isNext,
  }))
})
const nextRow = computed(() =>
  prayerRows.value.find(p => p.isNext) || prayerRows.value[0] || null
)

const sunriseText = computed(() => {
  const raw = props.prayerData?.sunrise
  if (!raw) return ''
  return fmtPrayer(getPrayerDateTime(raw, true, false, props.baseDate))
})
const fajrText = computed(() => fmtPrayer(prayerAt(props.prayerData, 'fajr', 'azaan')))

/** Countdown shown on the focus card: to this prayer's adhan while it is still
 *  ahead, otherwise to its iqamah. */
const nextInText = computed(() => {
  const key = nextRow.value?.key
  if (!key) return ''
  const adhan  = prayerAt(props.prayerData, key, 'azaan')
  const iqamah = prayerAt(props.prayerData, key, 'iqamah')
  // A Jumu'ah session counts down to its khutbah, not to Dhuhr's iqamah.
  const khutbah = nextRow.value?.isJumuah ? nextJumuahAt(props.jumuahPrayers, now.value) : null
  const target = khutbah || (adhan && adhan > now.value ? adhan : iqamah)
  if (!target) return ''
  let secs = Math.round((target.getTime() - now.value.getTime()) / 1000)
  if (secs < 0) secs += 86400
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return T.value.in(h, m, secs % 60)
})

// ── Screen state machine ────────────────────────────────────────────────────
/** The next adhan ahead of now; rolls over to tomorrow's Fajr after Isha. */
const nextAdhan = computed(() => {
  if (!props.prayerData) return null
  for (const { key } of PRAYERS) {
    const t = prayerAt(props.prayerData, key, 'azaan')
    if (t && t > now.value) return { key, at: t }
  }
  const fajr = prayerAt(props.prayerData, 'fajr', 'azaan')
  if (!fajr) return null
  const t = new Date(fajr)
  t.setDate(t.getDate() + 1)
  return { key: 'fajr', at: t }
})

/** The most recent adhan that has already passed today. */
const lastAdhan = computed(() => {
  if (!props.prayerData) return null
  let found = null
  for (const { key } of PRAYERS) {
    const t = prayerAt(props.prayerData, key, 'azaan')
    if (t && t <= now.value) found = { key, at: t }
  }
  return found
})

// Shared with PrayerInterrupt.vue (and the same settings drive both), so the rules
// for "which event is next" live in utils/prayerCountdown.js.
const leadMs = computed(() => countdownLeadMs(props.countdownLeadMin))
const nextEvent = computed(() =>
  props.prayerData
    ? findNextEvent((key, kind) => prayerAt(props.prayerData, key, kind),
                    countdownKinds(props.countdownFor), now.value)
    : null
)

const finalActive = computed(() => {
  if (!leadMs.value || !nextEvent.value) return false
  const left = nextEvent.value.at.getTime() - now.value.getTime()
  return left > 0 && left <= leadMs.value
})

const adhanActive = computed(() => {
  if (props.isAthanPlaying) return true
  if (!lastAdhan.value) return false
  return now.value.getTime() - lastAdhan.value.at.getTime() < SILENT_ADHAN_MS
})

const nightActive = computed(() => {
  const today = props.todayPrayerData || props.prayerData
  const base  = new Date(now.value)
  const ishaIqamah = prayerAt(today, 'isha', 'iqamah', base)
  const fajrAzaan  = prayerAt(props.prayerData, 'fajr', 'azaan', base)
  if (!ishaIqamah || !fajrAzaan) return false
  const start = new Date(ishaIqamah.getTime() + Number(props.nightAfterIshaMin || 0) * 60_000)
  return now.value >= start || now.value < fajrAzaan
})

const focusOn = computed(() => Number(props.focusIntervalSec) > 0)

// A swipe parks the display on one screen. It overrides the night screen and the
// schedule/focus alternation.
const manualScreen = ref(null)   // null = automatic, else 'schedule' | 'main' | 'night'

/** Identity of the interrupt currently on screen, so a dismissal applies to that
 *  one occurrence only and the next adhan/countdown still comes through. */
const interruptKey = computed(() => {
  if (adhanActive.value) return `adhan:${lastAdhan.value?.at.getTime() ?? 'live'}`
  if (finalActive.value) return `final:${nextEvent.value.kind}:${nextEvent.value.at.getTime()}`
  return null
})
const dismissedInterrupt = ref(null)
const interruptDismissed = computed(() =>
  dismissedInterrupt.value !== null && dismissedInterrupt.value === interruptKey.value
)
// Drop a stale dismissal once its event is over, so the ref never pins an old key.
watch(interruptKey, k => { if (k === null) dismissedInterrupt.value = null })

const screen = computed(() => {
  if (!props.prayerData) return 'schedule'
  if (!interruptDismissed.value) {
    if (adhanActive.value) return 'adhan'
    if (finalActive.value) return 'final'
  }
  if (manualScreen.value) return manualScreen.value
  if (nightActive.value) return 'night'
  return focusOn.value && showFocus.value ? 'main' : 'schedule'
})

// ── Swipe to switch screens ─────────────────────────────────────────────────
const SWIPE_MIN_PX = 60          // shorter drags are taps or jitter
const SWIPE_MAX_MS = 1500        // slow panels add dispatch latency
const swipeStart = ref(null)

/** Night: night <-> schedule. Day: schedule <-> main (the focus card). */
function toggleView() {
  const current = screen.value
  let next
  if (current === 'night') next = 'schedule'
  else if (nightActive.value) next = 'night'
  else next = current === 'main' ? 'schedule' : 'main'

  manualScreen.value = next
  showFocus.value = next === 'main'     // keep the auto state in step
  restartFocusTimer(false)              // restart the countdown, keep this screen
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  swipeStart.value = { x: e.clientX, y: e.clientY, t: Date.now() }
}

/** Swipe away from the adhan or countdown screen. Dismissing the adhan screen also
 *  stops the audio: leaving it playing behind the schedule is never what the swipe
 *  meant, and the mute button is the way to keep the screen but silence it. */
function dismissInterrupt() {
  dismissedInterrupt.value = interruptKey.value
  if (props.isAthanPlaying) emit('stop-athan')
  manualScreen.value = null
  restartFocusTimer()
}

function onPointerUp(e) {
  const start = swipeStart.value
  swipeStart.value = null
  if (!start) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Date.now() - start.t > SWIPE_MAX_MS) return
  // Horizontal intent only, so a stray vertical drag doesn't flip the screen.
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (screen.value === 'adhan' || screen.value === 'final') dismissInterrupt()
  else toggleView()
}

// Hand control back to the automatic behaviour when night starts or ends.
watch(nightActive, () => { manualScreen.value = null })

/** The adhan screen always names an adhan; the countdown names whichever event it
 *  is actually running for, so the two have to be resolved separately. */
const eventKind = computed(() =>
  screen.value === 'adhan' ? 'azaan' : (nextEvent.value?.kind || 'azaan')
)
/** Prayer named on the adhan / countdown screens. */
const eventPrayerName = computed(() => {
  const key = screen.value === 'adhan'
    ? (lastAdhan.value?.key || nextAdhan.value?.key)
    : nextEvent.value?.key
  return key ? T.value[key] : ''
})
/** "Time for Athan" / "Time for Iqamah" — the label above the prayer name. */
const eventLabel = computed(() => T.value.timeFor(eventKind.value))

// ── Countdown ring (smooth: its own frame loop, only while the final minute runs) ──
const ring = computed(() => {
  const span   = (leadMs.value || 60_000) / 1000
  const target = nextEvent.value?.at.getTime() ?? 0
  const left   = Math.max(0, (target - fineNow.value) / 1000)
  const f      = Math.max(0, Math.min(1, left / span))
  const arc    = f * RING_LEN - RING_GAP - RING_SW
  const track  = RING_LEN - RING_GAP - RING_SW - f * RING_LEN
  return {
    arcDash:      `${Math.max(arc, 0)} ${RING_LEN}`,
    arcOffset:    -RING_SW / 2,
    arcVisible:   arc > 0,
    trackDash:    `${Math.max(track, 0)} ${RING_LEN}`,
    trackOffset:  -(f * RING_LEN + RING_SW / 2),
    trackVisible: track > 0,
    seconds:      countdownText(Math.max(0, Math.ceil(left - 1e-6))),
  }
})

// Coming out of an interruption (adhan finished, countdown over, morning) always lands
// back on the schedule, with the focus rotation restarted from there — otherwise the
// free-running timer can drop the viewer straight onto the focus card instead.
watch(screen, (s, prev) => {
  if (s !== prev && ['adhan', 'final'].includes(prev)) {
    manualScreen.value = null
    restartFocusTimer()
  }
})

watch(screen, s => {
  if (s === 'final' && ringFrame == null) {
    const loop = () => { fineNow.value = Date.now() + clockOffsetMs.value; ringFrame = requestAnimationFrame(loop) }
    ringFrame = requestAnimationFrame(loop)
  } else if (s !== 'final' && ringFrame != null) {
    cancelAnimationFrame(ringFrame)
    ringFrame = null
  }
})

// ── Card style, contrast theme, background ──────────────────────────────────
const toMinutes = d => (d ? d.getHours() * 60 + d.getMinutes() : null)

const resolvedCardStyle = computed(() => {
  const c = props.cardStyle || 'dark'
  if (c !== 'auto') return c
  // 'auto': light cards between sunrise and Maghrib adhan, dark after.
  const sunrise = props.prayerData?.sunrise
    ? toMinutes(getPrayerDateTime(props.prayerData.sunrise, true, false, props.baseDate))
    : null
  const maghrib = toMinutes(prayerAt(props.prayerData, 'maghrib', 'azaan'))
  if (sunrise == null || maghrib == null) return 'dark'
  const n = now.value.getHours() * 60 + now.value.getMinutes()
  return n >= sunrise && n < maghrib ? 'light' : 'dark'
})

const isHc = computed(() => /^hc-/.test(props.contrast))

// ── Material 3 colour roles ─────────────────────────────────────────────────
// In M3 primary-container / on-primary-container are tones of the *same* source as
// primary. They were pinned to the stock green, so choosing any other Accent left
// the highlighted tile green while the prayer name and ring followed the accent.
const accentHex = computed(() =>
  /^#[0-9a-f]{3,8}$/i.test(props.accentColor) ? props.accentColor : '#8fd8a8'
)
const primaryContainer = computed(() => {
  const a = accentHex.value
  // Light surfaces take a high tone of primary; dark surfaces a low one.
  return resolvedCardStyle.value === 'light' ? mixHex('#ffffff', a, 0.55) : darken(a, 0.34)
})
const onPrimaryContainer = computed(() => {
  const a = accentHex.value
  return resolvedCardStyle.value === 'light' ? darken(a, 0.22) : mixHex('#ffffff', a, 0.45)
})
const containerRgb = computed(() => {
  const { r, g, b } = hexToRgb(primaryContainer.value)
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`
})

const rootClass = computed(() => [
  screen.value === 'night' ? 'is-night' : '',
  isHc.value ? `hc theme-${props.contrast}` : '',
  !isHc.value && resolvedCardStyle.value === 'light' ? 'cs-light' : '',
  !isHc.value && resolvedCardStyle.value === 'tonal' ? 'cs-tonal' : '',
  props.darkMode ? 'is-dim' : '',
])

const rootStyle = computed(() => ({
  '--primary': props.accentColor,
  // Omitted under a high-contrast theme: those define their own pairs in CSS, and an
  // inline custom property would outrank the class rule.
  ...(isHc.value ? {} : {
    '--hi-rgb': containerRgb.value,
    '--on-hi': onPrimaryContainer.value,
  }),
  '--card-a': String(Math.max(0, Math.min(100, Number(props.cardOpacity) || 0)) / 100),
  '--adhan-scale': String(Number(props.adhanScale) || 1),
  '--iqamah-scale': String(Number(props.iqamahScale) || 1),
  '--logo-w': props.mosqueLogoWidth,
}))

const bgStyle = computed(() => ({
  backgroundImage: props.bgImage ? `url("${props.bgImage}")` : 'none',
}))

const backdropLayer = computed(() => {
  const o = Number(props.backdropOpacity) || 0
  if (o <= 0) return null
  return { background: props.backdropColor, opacity: String(o) }
})

// ── Stage scaling: the design's 1280 x 800 box, centred and scaled to fit ───
const scale = ref(1)
const stageStyle = computed(() => ({ transform: `translate(-50%, -50%) scale(${scale.value})` }))
const fitStage = () => {
  scale.value = Math.min(window.innerWidth / 1280, window.innerHeight / 800)
}

// ── Weather (Open-Meteo, no key; only when the mosque's lat/lng are known) ──
const weatherRaw = ref(null)
const WEATHER_ICONS = [
  { max: 1,  icon: 'sunny',  en: 'Sunny',   ar: 'مشمس'    },
  { max: 3,  icon: 'cloudy', en: 'Cloudy',  ar: 'غائم'    },
  { max: 49, icon: 'cloudy', en: 'Foggy',   ar: 'ضبابي'   },
  { max: 69, icon: 'rainy',  en: 'Rain',    ar: 'ممطر'    },
  { max: 79, icon: 'snowy',  en: 'Snow',    ar: 'ثلوج'    },
  { max: 84, icon: 'rainy',  en: 'Showers', ar: 'زخات'    },
  { max: 99, icon: 'rainy',  en: 'Storms',  ar: 'عواصف'   },
]
const weather = computed(() => {
  if (!props.showWeather || !weatherRaw.value) return null
  const { temp, high, low, code } = weatherRaw.value
  const m = WEATHER_ICONS.find(x => code <= x.max) || WEATHER_ICONS[1]
  // Only the sun glyph takes the gold fill; a gold cloud or raindrop reads as wrong.
  return { temp, high, low, icon: ICON[m.icon], cond: m[lang.value], isSun: m.icon === 'sunny' }
})

async function fetchWeather() {
  const lat = Number(props.lat), lng = Number(props.lng)
  if (!props.showWeather || !Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return
  const unit = props.weatherUnit === 'c' ? 'celsius' : 'fahrenheit'
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lng}`
    + '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min'
    + `&temperature_unit=${unit}&timezone=auto&forecast_days=1`
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return
    const j = await res.json()
    weatherRaw.value = {
      temp: Math.round(j.current?.temperature_2m ?? 0),
      code: Number(j.current?.weather_code ?? 0),
      high: Math.round(j.daily?.temperature_2m_max?.[0] ?? 0),
      low:  Math.round(j.daily?.temperature_2m_min?.[0] ?? 0),
    }
  } catch (_) {
    // A frame with no network keeps whatever it last had, or simply shows no weather.
  }
}

// ── Timers ──────────────────────────────────────────────────────────────────
/** One alternation tick, off the board's shared rotation clock
 *  (utils/viewRotation.js) — the clock the events and Jumu'ah slides take their slot
 *  from, so each screen gets its whole dwell before a slide comes up. A manual swipe
 *  is handed back to the clock during the day; at night nothing alternates, so the
 *  swipe stands until the next one. */
function onFocusTick() {
  if (!nightActive.value) manualScreen.value = null
  showFocus.value = boardPhase.value % 2 === 1
}
watch(boardPhase, onFocusTick)

/** @param resetView false keeps the current screen and only restarts the clock. */
function restartFocusTimer(resetView = true) {
  if (resetView) {
    showFocus.value = false
    resetRotation()
  } else {
    restartRotationDwell(showFocus.value)
  }
}
// Wrapped: watch() would pass the new interval in as restartFocusTimer's resetView.
watch(() => props.focusIntervalSec, () => restartFocusTimer())
watch(() => [props.lat, props.lng, props.weatherUnit], fetchWeather)

onMounted(() => {
  fitStage()
  window.addEventListener('resize', fitStage)
  clockTimer = setInterval(() => { now.value = debugNow() }, 1000)
  dateTimer  = setInterval(() => { dateIndex.value = dateIndex.value === 0 ? 1 : 0 }, 6000)
  restartFocusTimer()
  fetchWeather()
  weatherTimer = setInterval(fetchWeather, 15 * 60 * 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', fitStage)
  clearInterval(clockTimer)
  clearInterval(dateTimer)
  clearInterval(weatherTimer)
  if (ringFrame != null) cancelAnimationFrame(ringFrame)
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() }, toggleView)
</script>

<style scoped>
/* Material 3 values at 2x, because the frame is read from about 3 m:
   margins 48px, card padding 32px, gaps 16px, card corners 24px. */
.l11-root {
  --on-surface: #dfe4dd;
  --on-surface-variant: #c0c9c0;
  --primary: #8fd8a8;
  --on-primary-container: #abf4c3;
  --outline: #8a938b;
  --card-rgb: 38 43 39;
  --hi-rgb: 0 82 50;
  --on-card: #dfe4dd;
  --on-card-var: #c0c9c0;
  --on-hi: #abf4c3;
  --line: #404943;
  --card-a: 1;
  --border: 0 solid transparent;
  --sun: #fdd663;
  --bg-solid: #000;
  position: absolute;
  inset: 0;
  overflow: hidden;
  font-family: 'Cairo', 'Noto Sans Arabic', 'Roboto', system-ui, sans-serif;
  color: var(--on-surface);
  font-variant-numeric: tabular-nums;
  touch-action: none;            /* let horizontal swipes reach the handlers */
}

.cs-light { --card-rgb: 228 233 225; --hi-rgb: 171 244 195; --on-card: #191c19; --on-card-var: #404943; --on-hi: #002111; --line: #c0c9c0; }
.cs-tonal { --card-rgb: 55 75 61; --on-card: #d1e8d5; --on-card-var: #d1e8d5; --line: #8a938b; }

/* High-contrast themes for low vision: solid colors, no photo, bordered opaque cards. */
/* The high-contrast themes only restate the surface tokens, so the card tokens have to
   be pointed back at them — otherwise the green-on-dark card colors survive and the
   highlighted tile ends up pale green on yellow. */
.hc {
  --card-a: 1;
  --border: 4px solid var(--on-surface);
  --outline: var(--on-surface);
  --on-card: var(--on-surface);
  --on-card-var: var(--on-surface-variant);
  --on-hi: var(--on-primary-container);
  --line: var(--on-surface);
}
.theme-hc-white  { --bg-solid: #000; --on-surface: #fff; --on-surface-variant: #fff; --primary: #fff    !important; --on-primary-container: #000; --card-rgb: 0 0 0; --hi-rgb: 255 255 255; --sun: #fff; }
.theme-hc-red    { --bg-solid: #000; --on-surface: #fff; --on-surface-variant: #fff; --primary: #ff0000 !important; --on-primary-container: #000; --card-rgb: 0 0 0; --hi-rgb: 255 0 0;     --sun: #fff; }
.theme-hc-green  { --bg-solid: #000; --on-surface: #fff; --on-surface-variant: #fff; --primary: #00e676 !important; --on-primary-container: #000; --card-rgb: 0 0 0; --hi-rgb: 0 230 118;   --sun: #fff; }
.theme-hc-yellow { --bg-solid: #000; --on-surface: #ff0; --on-surface-variant: #ff0; --primary: #ffff00 !important; --on-primary-container: #000; --card-rgb: 0 0 0; --hi-rgb: 255 255 0;   --sun: #ff0; }
.theme-hc-black  { --bg-solid: #fff; --on-surface: #000; --on-surface-variant: #000; --primary: #000000 !important; --on-primary-container: #fff; --card-rgb: 255 255 255; --hi-rgb: 0 0 0; --sun: #000; }

/* ── Background layers (viewport-wide, so no letterboxing round the stage) ── */
.l11-ground { position: absolute; inset: 0; background: var(--bg-solid); }
.l11-bg { position: absolute; inset: 0; background: center / cover no-repeat; }
.l11-bg::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.68) 0%, rgba(0,0,0,.5) 30%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.6) 100%);
}
.l11-bg.night-tone { filter: brightness(.4); }
.l11-bg.night-tone::after { background: linear-gradient(to bottom, rgba(0,0,0,.45), rgba(0,0,0,.15) 50%, rgba(0,0,0,.5)); }
.hc .l11-bg { display: none; }
.l11-backdrop { position: absolute; inset: 0; pointer-events: none; }

/* ── Stage ── */
.l11-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1280px;
  height: 800px;
  transform-origin: center center;
  font-size: 32px;
  line-height: 48px;
}
/* The design was authored against a `* { margin: 0; padding: 0 }` reset. Without it the
   UA's default <p> margin lifts the footer lines 32px and they collide with the tiles. */
.l11-stage p { margin: 0; padding: 0; }
.num { direction: ltr; unicode-bidi: isolate; }

/* ── Cards ── */
.card {
  background: rgb(var(--card-rgb) / var(--card-a));
  border: var(--border);
  border-radius: 24px;
  color: var(--on-card);
}
.card.on { background: rgb(var(--hi-rgb) / var(--card-a)); color: var(--on-hi); }
.hc .card { background: rgb(var(--card-rgb)); }
.hc .card.on { background: rgb(var(--hi-rgb)); }
hr { border: 0; border-top: 2px solid var(--line); margin: 0; }
.hc hr { border-top-color: currentColor; }

/* ── Clock block ── */
.clock { position: absolute; top: 48px; left: 48px; }
.time { font-size: 114px; line-height: 128px; font-weight: 400; white-space: nowrap; font-variant-numeric: tabular-nums; }
.date { display: grid; font-size: 44px; line-height: 56px; }
.date span { grid-area: 1 / 1; opacity: 0; transition: opacity 90ms cubic-bezier(.2, 0, 0, 1); white-space: nowrap; }
.date span.on { opacity: 1; transition: opacity 210ms cubic-bezier(.2, 0, 0, 1) 90ms; }

/* ── Weather (or the mosque logo in its place) ── */
/* Flat block + one flex row, mirroring .sun / .place. Grid auto-placement put the
   H/L line on row 1 on the frame's WebView, and a nested flex column let the icon
   land on top of the temperature; this structure renders correctly on both. */
.weather { position: absolute; top: 48px; right: 48px; }
.weather .ico { width: 48px; height: 48px; flex: none; fill: var(--on-surface); }
.weather .ico.is-sunny { fill: var(--sun); }   /* not .sun — that's the footer sunrise line */
.weather .now { display: flex; align-items: center; white-space: nowrap; }
.weather .deg { font-size: 72px; line-height: 88px; }
.weather .cond { font-size: 44px; line-height: 56px; }
.weather .range { font-size: 32px; line-height: 48px; font-weight: 500; color: var(--on-surface-variant); white-space: nowrap; }
.l11-logo { position: absolute; top: 48px; right: 48px; width: var(--logo-w); height: auto; object-fit: contain; }

/* ── Footer lines ── */
.place, .sun {
  position: absolute; bottom: 48px;
  display: flex; align-items: center;
  font-size: 32px; line-height: 48px;
}
.place { right: 48px; }
.sun { left: 48px; }
.sun.end { left: auto; right: 48px; bottom: 96px; }
.place svg, .sun svg { width: 40px; height: 40px; fill: currentColor; flex: none; }

/* ── Main (focus) screen: next-prayer card, 736 x 400 ── */
.next {
  position: absolute; left: 48px; bottom: 48px;
  width: 736px; height: 400px; padding: 32px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.next .row { display: flex; justify-content: space-between; align-items: baseline; }
.next .name { font-size: 90px; line-height: 104px; }
.next .row .name.num { font-size: min(calc(90px * var(--adhan-scale)), 112px); }
.next .when { font-size: 56px; line-height: 72px; text-align: end; }
.next .khateeb { font-size: 40px; line-height: 52px; font-weight: 600; opacity: .85; }
.next .iq { font-size: 56px; line-height: 72px; }
.next .iq .num { font-size: min(calc(64px * var(--iqamah-scale)), 86px); }

/* ── Schedule screen: five tiles, 400 tall, 16 apart ── */
.tiles { position: absolute; left: 48px; right: 48px; top: 296px; display: flex; }
.tile { flex: 1; height: 400px; padding: 36px 16px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; }
.tile .pname { font-size: 44px; line-height: 56px; }
/* Khateeb under the session name on the Friday tiles. Clamped to two lines so a
   long name cannot push the iqamah block off the bottom of a fixed-height tile. */
.tile .tkhateeb {
  font-size: 30px; line-height: 38px; font-weight: 500; opacity: .8;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.tile .adhan { font-size: min(calc(64px * var(--adhan-scale)), 72px); line-height: 80px; }
.tile .sub { font-size: 32px; line-height: 48px; font-weight: 500; opacity: .85; }
.tile .iqt { font-size: min(calc(48px * var(--iqamah-scale)), 72px); line-height: 64px; }
.tile hr { margin-left: 16px; margin-right: 16px; }

/* ── Adhan and final minute ── */
.label { position: absolute; top: 48px; left: 48px; font-size: 48px; line-height: 64px; color: var(--on-surface-variant); }
.bigname { position: absolute; top: 96px; left: 48px; font-size: 198px; line-height: 230px; color: var(--primary); white-space: nowrap; }

.pill {
  position: absolute; bottom: 48px; left: 48px;
  height: 96px; padding-left: 32px; padding-right: 32px; border-radius: 48px;
  display: flex; align-items: center;
  font-size: 48px; line-height: 64px; white-space: nowrap;
  background: rgb(var(--hi-rgb) / var(--card-a)); color: var(--on-hi); border: var(--border);
}
.pill svg { width: 48px; height: 48px; fill: currentColor; flex: none; }
.pill span { direction: rtl; }

/* Mute button: mirrors the caption pill across the frame. */
.l11-mute {
  position: absolute; bottom: 48px; right: 48px;
  isolation: isolate;
  margin: 0; padding: 0; font: inherit;
  width: 96px; height: 96px; border-radius: 48px;
  display: grid; place-items: center; cursor: pointer;
  background: rgb(var(--card-rgb) / var(--card-a));
  color: var(--on-card);
  border: var(--border);
  transition: background 150ms, color 150ms;
}
.l11-mute svg { width: 56px; height: 56px; fill: currentColor; }
/* M3 state layer: 8% on hover, 12% on press, over the container colour. */
.l11-mute::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: currentColor; opacity: 0; transition: opacity 100ms linear;
}
.l11-mute:hover::after { opacity: .08; }
.l11-mute:active::after { opacity: .12; }
.l11-mute.muted { background: rgb(var(--hi-rgb) / var(--card-a)); color: var(--on-hi); }
.hc .l11-mute { background: rgb(var(--card-rgb)); }
.hc .l11-mute.muted { background: rgb(var(--hi-rgb)); }

/* ── Final-minute ring (Material 3 circular progress) ── */
.ring { position: absolute; bottom: 56px; right: 56px; width: 352px; height: 352px; display: grid; place-items: center; }
.ring::before {
  content: ''; position: absolute; left: 50%; top: 50%; width: 600px; height: 600px; transform: translate(-50%, -50%);
  background: radial-gradient(circle closest-side, rgba(0,0,0,.62), rgba(0,0,0,.38) 60%, rgba(0,0,0,0));
}
.hc .ring::before { display: none; }
.ring svg { position: absolute; inset: -24px; width: 400px; height: 400px; fill: none; stroke: var(--primary); stroke-width: 14; stroke-linecap: round; }
[dir='rtl'] .ring svg { transform: scaleX(-1); }

/* `gap` inside a flex container is Chrome 84+. These frames run Chromium 83, where it
   is ignored outright and the children sit flush - the prayer tiles touched, and every
   icon jammed against its label. Margin spacing is equivalent and works everywhere.
   (Grid `gap` is fine in 83, so only flex containers are converted here.) */
.tiles > * + *,
.weather .now > * + *,
.place > * + *,
.sun > * + *,
.pill > * + * { margin-left: 16px; }
[dir='rtl'] .tiles > * + *,
[dir='rtl'] .weather .now > * + *,
[dir='rtl'] .place > * + *,
[dir='rtl'] .sun > * + *,
[dir='rtl'] .pill > * + * { margin-left: 0; margin-right: 16px; }

/* RTL mirrors. These were `inset-inline-*` logical properties, but the frames this
   layout targets run Chromium 83, which supports neither logical properties nor the
   `:is()`/level-4 `:not()` that esbuild and Lightning CSS emit when lowering them -
   so the lowered rule was dropped and every corner element collapsed to the top-left.
   Physical properties plus an explicit [dir='rtl'] mirror work everywhere. */
[dir='rtl'] .clock    { left: auto;  right: 48px; }
[dir='rtl'] .weather  { right: auto; left: 48px; }
[dir='rtl'] .l11-logo { right: auto; left: 48px; }
[dir='rtl'] .place    { right: auto; left: 48px; }
[dir='rtl'] .sun      { left: auto;  right: 48px; }
[dir='rtl'] .sun.end  { right: auto; left: 48px; }
[dir='rtl'] .next     { left: auto;  right: 48px; }
[dir='rtl'] .label    { left: auto;  right: 48px; }
[dir='rtl'] .bigname  { left: auto;  right: 48px; }
[dir='rtl'] .pill     { left: auto;  right: 48px; }
[dir='rtl'] .l11-mute { right: auto; left: 48px; }
[dir='rtl'] .ring     { right: auto; left: 56px; }
.ring .track { stroke-opacity: .4; }
.ring .secs { position: relative; font-size: 187px; line-height: 1; font-weight: 400; color: var(--on-surface); direction: ltr; max-width: 86%; }
/* 187px holds the "59"…"9" a one-minute lead produces. A longer Countdown Lead sends
   "12:04" through here, which at that size is 464px wide in a 352px ring. */
.ring .secs-4 { font-size: 150px; }
.ring .secs-5 { font-size: 118px; }
.ring .secs-6 { font-size: 100px; }

/* ── Night: black screen, dim clock (also drop the backlight on the device) ── */
.is-night .l11-ground { background: #000; }
.is-night.hc .l11-ground { background: var(--bg-solid); }
.night-inner {
  position: absolute; inset: 0;
  display: grid; place-content: center; text-align: center;
}
.night-inner .bignum { font-size: 342px; line-height: 1; color: var(--on-surface-variant); }
.night-inner .next-line { margin-top: 24px; font-size: 48px; line-height: 64px; color: var(--outline); }

@media (prefers-reduced-motion: reduce) {
  .date span, .date span.on { transition: none; }
}
</style>
