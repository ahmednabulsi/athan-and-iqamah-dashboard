<template>
  <div class="l5-root" :dir="dir" :class="{ 'is-dark night-bg-root': darkMode }">

    <!-- Solid background overlay (transparent = keep the photo) -->
    <div class="l5-bg-overlay"></div>
    <div class="l5-backdrop"></div>

    <img v-if="logoSrc && logoWidth !== 'none'" class="l5-logo" :src="logoSrc" :alt="T.mosqueLogo" />

    <!-- Clock, then one line carrying both calendars -->
    <div class="l5-head">
      <div class="l5-clock">
        <span class="l5-clock-hm">{{ clockHm }}</span><span
          v-if="clockSec" class="l5-clock-sec">{{ clockSec }}</span><span
          v-if="clockParts.period" class="l5-clock-period">{{ clockParts.period }}</span>
      </div>
      <div class="l5-dateline">
        <span class="l5-date-greg">{{ dateLine }}</span>
        <span v-if="showHijri" class="l5-date-sep">&#9670;</span>
        <span v-if="showHijri" class="l5-date-hijri">{{ hijriDate }}</span>
      </div>
    </div>

    <!-- Next prayer and its countdown, lifted out of the table -->
    <div class="l5-next" v-if="showCountdown && activeCountdown && nextRow">
      <div class="l5-next-block">
        <div class="l5-next-label">{{ T.next }}</div>
        <div class="l5-next-name">{{ nextRow.name }}</div>
      </div>
      <div class="l5-next-block l5-next-end">
        <div class="l5-next-label">{{ activeCountdown.label }}</div>
        <div class="l5-next-time">{{ activeCountdown.time }}</div>
      </div>
    </div>

    <!-- Column labels -->
    <div class="l5-col-header">
      <span class="l5-ch-prayer">{{ T.prayer }}</span>
      <span class="l5-ch-time">{{ T.adhan }}</span>
      <span class="l5-ch-time">{{ T.iqamah }}</span>
    </div>

    <!-- Prayer rows -->
    <div class="l5-rows">

      <template v-for="p in prayers" :key="p.rowKey || p.key">
        <div
          class="l5-row"
          :class="{ active: activePrayerKey === p.key && (!p.isJumuah || p.isNextJumuah) }"
        >
          <div class="l5-row-inner">
            <span class="l5-pname">{{ p.name }}</span>
            <span class="l5-ptime" :class="`period-${prayerPeriodStyle}`">
              <span class="l5-time-num">{{ p.adhan.num }}</span>
              <span v-if="showPrayerPeriod(p.adhan)" class="l5-period">{{ p.adhan.period }}</span>
            </span>
            <span class="l5-ptime l5-gold" :class="`period-${prayerPeriodStyle}`">
              <span class="l5-time-num">{{ p.iqamah.num }}</span>
              <span v-if="showPrayerPeriod(p.iqamah)" class="l5-period">{{ p.iqamah.period }}</span>
            </span>
          </div>
          <div v-if="p.speaker" class="l5-speaker-line">
            <span class="l5-speaker-label">{{ T.khateeb }}</span>
            <span class="l5-speaker-name">{{ p.speaker }}</span>
          </div>
          <div v-if="showChangeAlert && p.tomorrowIqamah && activePrayerKey !== p.key" class="l5-iqamah-change-line">
            <span class="l5-iqamah-change-content">
              <span class="l5-iqamah-change-label">&#128276; {{ T.tomorrow }}</span>
              <span class="l5-iqamah-change-time">{{ p.tomorrowIqamah }}</span>
            </span>
          </div>
        </div>

        <!-- Sunrise is not a prayer: its own quiet row, directly under Fajr -->
        <div v-if="showSunrise && p.key === 'fajr' && sunriseTime" class="l5-row l5-row-sunrise">
          <div class="l5-row-inner">
            <span class="l5-pname l5-sunrise-name">{{ T.sunrise }}</span>
            <span class="l5-ptime l5-sunrise-time">{{ sunriseTime }}</span>
            <span class="l5-ptime l5-sunrise-dash">&#8212;</span>
          </div>
        </div>
      </template>

    </div>

    <div class="l5-foot" v-if="showMosque && props.mosqueName">&#128205; {{ props.mosqueName }}</div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { formatClock, formatHijriLocalized, getPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate, nextJumuahIndex } from '../utils/jumuah.js'
import mcaLogoPng from '../assets/mca-logo.png'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { clampCqi } from '../utils/cssUnits'

const props = defineProps({
  prayerData:         Object,
  tomorrowPrayerData: Object,
  nextPrayerKey:      String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  mosqueName:         String,
  // 'en' | 'ar' — flips every label and the text direction.
  lang:               { type: String, default: 'en' },
  mosqueId:           String,
  // Native-configurable (Android toolbar) — reactive via v-bind(), live updates.
  textColor:   { type: String, default: '#FFFFFF' },
  accentColor: { type: String, default: '#E8A020' },
  bgColor:     { type: String, default: 'transparent' }, // 'transparent' keeps the photo
  bgImage:     { type: String, default: 'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/bg-222.jpg' },
  bgRepeat:    { type: [Boolean, String], default: false },
  adhanSize:   { type: String, default: '2.9em' },
  iqamahSize:  { type: String, default: '3.1em' },
  topPadding:  { type: String, default: '120px' },
  rotation:    { type: String, default: '90deg' }, // '90deg' or '270deg' (portrait mounting)
  activeRowColor:   { type: String, default: '#FFFFFF' },
  activeRowOpacity: { type: [Number, String], default: '0.15' },
  logoUrl:          { type: String, default: '' },
  logoWidth:        { type: String, default: clampCqi('120px', 20, '180px') },
  periodStyle:      { type: String, default: 'off' },
  timeFormat:  { type: String, default: '12' },
  hijriOffset: { type: Number, default: 0 },
  showSeconds: { type: Boolean, default: true },
  showHijri:   { type: Boolean, default: true },
  showSunrise: { type: Boolean, default: true },
  showMosque:  { type: Boolean, default: true },
  showCountdown:   { type: Boolean, default: true },
  showChangeAlert: { type: Boolean, default: true },
  messageAlignment: { type: String, default: 'left' },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

const { lang, dir, T, localeTag } = useLayoutLang(props, {
  en: { adhanInLine: 'Adhan in', iqamahInLine: 'Iqamah in', khutbahInLine: 'Khutbah in' },
  ar: { adhanInLine: 'الأذان بعد', iqamahInLine: 'الإقامة بعد', khutbahInLine: 'تبدأ الخطبة بعد' },
})

// Derived colors: a muted text tone (for hijri/day/sunrise labels) and the
// active-row highlight, both computed from textColor so they track it.
function hexToRgb(hex) {
  const h = String(hex).replace('#', '')
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(f, 16)
  return Number.isNaN(n) ? { r: 255, g: 255, b: 255 } : { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const textMuted   = computed(() => { const { r, g, b } = hexToRgb(props.textColor); return `rgba(${r}, ${g}, ${b}, 0.75)` })
const clampOpacity = value => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
}
const colorWithOpacity = (hex, opacity) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clampOpacity(opacity)})`
}
const activeRowBg = computed(() => colorWithOpacity(props.activeRowColor, props.activeRowOpacity))
/** The next-prayer card wears the accent at low strength, so it reads as one
 *  object without becoming a second highlight competing with the active row. */
const nextCardBorder = computed(() => colorWithOpacity(props.accentColor, 0.38))
const nextCardBg = computed(() => {
  const { r, g, b } = hexToRgb(props.accentColor)
  return `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.16), rgba(${r}, ${g}, ${b}, 0.04))`
})
const messageJustify = computed(() => ({ left: 'flex-start', center: 'center', right: 'flex-end' })[props.messageAlignment] || 'flex-start')
const bgImageCss = computed(() => props.bgImage ? `url("${String(props.bgImage).replace(/"/g, '\\"')}")` : 'none')
const bgRepeats = computed(() => props.bgRepeat === true || props.bgRepeat === 'true')
const bgRepeatCss = computed(() => bgRepeats.value ? 'repeat' : 'no-repeat')
const bgSizeCss = computed(() => bgRepeats.value ? 'auto' : 'cover')
const bgPositionCss = computed(() => bgRepeats.value ? 'top left' : 'center')

const MCA_IDS   = ['E5Av2wAX', 'vOLn92KM']
const MCA_NAMES = ['MCA', 'Masjid Al-Noor (MCA)', 'Muslim Community Association']

const now = ref(debugNow())
// Temporary visual test: start Layout 5 ten minutes before Fajr and let it tick.
const FAJR_PREVIEW_ENABLED = false
const previewStartedAt = new Date()
let clockInterval = null

const isMCA = computed(() =>
  MCA_IDS.includes(props.mosqueId) || MCA_NAMES.includes(props.mosqueName)
)
const logoSrc = computed(() => props.logoUrl.trim() || (isMCA.value ? mcaLogoPng : ''))

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    azaanKey: 'fajr_azaan',    iqamahKey: 'fajr_iqamah',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   azaanKey: 'dhuhr_azaan',   iqamahKey: 'dhuhr_iqamah',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     azaanKey: 'asr_azaan',     iqamahKey: 'asr_iqamah',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', azaanKey: 'maghrib_azaan', iqamahKey: 'maghrib_iqamah', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    azaanKey: 'isha_azaan',    iqamahKey: 'isha_iqamah',    isFajr: false, isDhuhr: false },
]

const activePrayerKey = computed(() => FAJR_PREVIEW_ENABLED ? 'fajr' : props.nextPrayerKey)
const viewNow = computed(() => {
  if (!FAJR_PREVIEW_ENABLED || !props.prayerData?.fajr_azaan) return now.value
  const fajrAdhan = getPrayerDateTime(props.prayerData.fajr_azaan, true, false, previewStartedAt)
  const elapsed = now.value.getTime() - previewStartedAt.getTime()
  return new Date(fajrAdhan.getTime() - 10 * 60 * 1000 + elapsed)
})

const hour12 = computed(() => props.timeFormat !== '24')
const displayTime = d => formatClock(d, { hour12: hour12.value, seconds: false, period: false })
const PRAYER_PERIOD_STYLES = ['off', 'inline', 'top', 'bottom', 'badge']
const prayerPeriodStyle = computed(() =>
  PRAYER_PERIOD_STYLES.includes(props.periodStyle) ? props.periodStyle : 'off'
)
const displayPrayerParts = d => {
  // Locale matters here: without it the AM/PM marker came back English on an
  // Arabic board ('AM' instead of 'ص'). Digits stay Latin - AR_LOCALE pins them.
  const parts = formatClock(d, {
    hour12: hour12.value, seconds: false, period: true, split: true, locale: localeTag.value,
  })
  return { num: parts.num, period: hour12.value ? String(parts.period || '').toUpperCase() : '' }
}
const emptyPrayerParts = () => ({ num: '--:--', period: '' })
const showPrayerPeriod = value => prayerPeriodStyle.value !== 'off' && !!value?.period

const IQAMAH_ALERT_KEYS = ['fajr', 'dhuhr', 'asr', 'isha']

const prayers = computed(() => {
  if (!props.prayerData) return PRAYERS.map(p => ({ ...p, name: T.value[p.key], adhan: emptyPrayerParts(), iqamah: emptyPrayerParts(), tomorrowIqamah: null }))
  const rows = PRAYERS.map(p => {
    const todayIq    = props.prayerData[p.iqamahKey]
    const tomorrowIq = props.tomorrowPrayerData?.[p.iqamahKey]
    const showChange = IQAMAH_ALERT_KEYS.includes(p.key) && tomorrowIq && tomorrowIq !== todayIq
    return {
      ...p,
      name:   T.value[p.key],
      adhan:  displayPrayerParts(getPrayerDateTime(props.prayerData[p.azaanKey], p.isFajr, p.isDhuhr)),
      iqamah: displayPrayerParts(getPrayerDateTime(todayIq,                      p.isFajr, p.isDhuhr)),
      tomorrowIqamah: showChange
        ? displayTime(getPrayerDateTime(tomorrowIq, p.isFajr, p.isDhuhr))
        : null,
    }
  })
  // On Friday the Dhuhr row becomes one row per Jumu'ah session.
  return withJumuahRows(rows, props.jumuahPrayers, (dhuhr, s, i) => ({
    ...dhuhr,
    rowKey:  `jumuah-${i}`,
    name:    jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:  displayPrayerParts(jumuahDate(s.time)),
    speaker: s.speaker || '',
    tomorrowIqamah: null,
  }))
})

const clockParts = computed(() => {
  return formatClock(viewNow.value, {
    hour12: hour12.value,
    seconds: props.showSeconds,
    split: true,
    locale: localeTag.value,
  })
})

const dayShort  = computed(() => viewNow.value.toLocaleDateString(localeTag.value, { weekday: 'short' }))
const dateShort = computed(() => viewNow.value.toLocaleDateString(localeTag.value, { month: 'short', day: 'numeric' }))

/** Hours:minutes and the seconds apart, so the seconds can sit small beside the clock. */
const clockHm = computed(() => {
  const num = String(clockParts.value.num || '')
  const cut = num.lastIndexOf(':')
  return props.showSeconds && cut > 0 ? num.slice(0, cut) : num
})
const clockSec = computed(() => {
  if (!props.showSeconds) return ''
  const num = String(clockParts.value.num || '')
  const cut = num.lastIndexOf(':')
  return cut > 0 ? num.slice(cut + 1) : ''
})

/** "Tuesday, Nov 10" - the long weekday reads better than TUE at board distance. */
const dateLine = computed(() =>
  viewNow.value.toLocaleDateString(localeTag.value, { weekday: 'long', month: 'short', day: 'numeric' })
)

/** The row the countdown card is about; a Jumu'ah session wins over plain Dhuhr. */
const nextRow = computed(() => {
  const rows = prayers.value
  return rows.find(p => p.key === activePrayerKey.value && (!p.isJumuah || p.isNextJumuah))
    || rows.find(p => p.key === activePrayerKey.value)
    || null
})

const gregorianDate = computed(() =>
  viewNow.value.toLocaleDateString(localeTag.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

// Our own month-name table: some WebViews lack Islamic month data and silently
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(viewNow.value, props.hijriOffset, lang.value))

const sunriseTime = computed(() => {
  if (!props.prayerData?.sunrise) return null
  const d = getPrayerDateTime(props.prayerData.sunrise, true, false)
  return displayTime(d)
})

const formatCountdown = milliseconds => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const activeCountdown = computed(() => {
  if (!props.prayerData || !activePrayerKey.value) return null
  const p = PRAYERS.find(x => x.key === activePrayerKey.value)
  if (!p) return null

  // A Jumu'ah row counts down to its own khutbah. Dhuhr's adhan has usually passed
  // by then, so the generic path would roll over to tomorrow's.
  if (activePrayerKey.value === 'dhuhr' && props.jumuahPrayers.length) {
    const session = props.jumuahPrayers[nextJumuahIndex(props.jumuahPrayers, viewNow.value)]
    const at = session ? jumuahDate(session.time, viewNow.value) : null
    if (at && at > viewNow.value) {
      return { label: T.value.khutbahInLine, time: formatCountdown(at - viewNow.value) }
    }
  }

  const adhanTime = getPrayerDateTime(props.prayerData[p.azaanKey], p.isFajr, p.isDhuhr, viewNow.value)
  const iqamahTime = getPrayerDateTime(props.prayerData[p.iqamahKey], p.isFajr, p.isDhuhr, viewNow.value)
  if (iqamahTime <= viewNow.value) {
    adhanTime.setDate(adhanTime.getDate() + 1)
    iqamahTime.setDate(iqamahTime.getDate() + 1)
  }
  const isBeforeAdhan = viewNow.value < adhanTime
  const target = isBeforeAdhan ? adhanTime : iqamahTime

  return {
    label: isBeforeAdhan ? T.value.adhanInLine : T.value.iqamahInLine,
    time: formatCountdown(target - viewNow.value),
  }
})

onMounted(() => { clockInterval = setInterval(() => { now.value = debugNow() }, 1000) })
onUnmounted(() => { clearInterval(clockInterval) })

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
* { box-sizing: border-box; }



.l5-root > * {
  position: relative;
  z-index: 1;
}

/* Solid background color layer: sits above the photo, below all content.
   'transparent' (the None swatch) keeps the photo visible. */
.l5-bg-overlay {
  position: absolute;
  inset: 0;
  background: v-bind(bgColor);
}
.l5-root > .l5-bg-overlay { z-index: 0; }
.l5-backdrop {
  position: absolute;
  inset: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}
.l5-root > .l5-backdrop { z-index: 0; }

.l5-root {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vh;
  height: 100vw;
  transform: translate(-50%, -50%) rotate(v-bind(rotation));
  transform-origin: center center;
  background-image: v-bind(bgImageCss);
  background-repeat: v-bind(bgRepeatCss);
  background-size: v-bind(bgSizeCss);
  background-position: v-bind(bgPositionCss);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: v-bind(textColor);
  padding: 205px 30px;
  /* The mosque name is the last line on the board and sits right on its bottom
     edge; the gap below it is this padding. */
  padding-bottom: 10px;
  padding-top: v-bind(topPadding);

  /* Make this rotated panel its own size-query container so all
     children scale from the *visible* width/height, not the
     unrotated viewport. cqi = visible width, cqb = visible height. */
/* This panel is always rotated (90deg / 270deg) and sized 100vh x 100vw, so its
   container-query inline size IS the viewport's height and its block size IS the
   viewport's width. `cqi`/`cqb` would be exact here - but they are Chrome 105+, and
   the MWE-004 frames run Chromium 83, where the whole declaration is invalid: the
   base font-size below fell back to an inherited 16px and the mosque line lost its
   `bottom`/`right`, landing on the Hijri date. vh/vw are the identical values with
   none of that risk. See LOCKED_FRAME_KIOSK_SETUP.md section 12. */
  container-type: size;
  container-name: l5;

  /* Single base unit that all child font-sizes derive from (in em).
     Tuned so a 1080-wide portrait TV ~matches the previous layout,
     while scaling cleanly to 720p/1440p/4K portrait. */
  font-size: clamp(11px, 1.95vh, 36px);
}

/* ── MCA logo header ─────────────────────────── */
.l5-logo {
  position: absolute;
  /* Track the top padding so the logo keeps a constant gap above the content
     (= 30px at the 120px default) instead of overlapping it: it sits in the
     arch's crown while the board's content starts as high as the frame allows. */
  top: calc(v-bind(topPadding) - 90px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  pointer-events: none;
  width: v-bind(logoWidth);
  height: auto;
  display: block;
}

/* ── Head: clock, then one line carrying both calendars ──
   Sized in `em` off the panel's viewport-derived base, so the block scales with
   the board rather than with the screen it happens to be rotated onto. */
.l5-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-bottom: 1.2em;
  z-index: 5;
}

.l5-clock {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-weight: 800;
  line-height: 1;
  color: v-bind(textColor);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.l5-clock-hm { font-size: 6em; letter-spacing: -0.015em; }

/* Seconds are for the glance that checks the board is still live; they should
   never compete with the hour. Same size as the AM/PM marker beside them. */
.l5-clock-sec {
  font-size: 1.7em;
  font-weight: 600;
  color: v-bind(textMuted);
  margin-left: 0.3em;
  font-feature-settings: normal;
}

.l5-clock-period {
  font-size: 1.7em;
  font-weight: 700;
  color: v-bind(accentColor);
  margin-left: 0.25em;
  font-feature-settings: normal;
}

.l5-dateline {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-top: 0.6em;
  font-size: 1.85em;
  line-height: 1.2;
  text-align: center;
}

.l5-date-greg  { font-weight: 700; color: v-bind(textColor); }
.l5-date-sep   { font-size: 0.6em; color: v-bind(accentColor); }
.l5-date-hijri { font-weight: 500; color: v-bind(textMuted); }

/* ── Next prayer card ────────────────────────
   The countdown used to sit inside the active row, competing with the times for
   the same glance. Hoisted out, it is the first thing the board says. */
.l5-next {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1em;
  flex-shrink: 0;
  margin-bottom: 1.2em;
  padding: 0.8em 1.1em 0.9em;
  border: 1px solid v-bind(nextCardBorder);
  border-radius: 0.85em;
  background: v-bind(nextCardBg);
  z-index: 5;
}

.l5-next-block { display: flex; flex-direction: column; min-width: 0; }
.l5-next-end   { align-items: flex-end; text-align: right; }

.l5-next-label {
  font-size: 1.15em;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: v-bind(accentColor);
  white-space: nowrap;
}

.l5-next-name {
  font-size: 2.9em;
  font-weight: 800;
  line-height: 1.05;
  color: v-bind(textColor);
  margin-top: 0.06em;
}

.l5-next-time {
  font-size: 2.9em;
  font-weight: 800;
  line-height: 1.05;
  color: v-bind(accentColor);
  margin-top: 0.06em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

/* ── Mosque name (footer) ────────────────────── */
.l5-foot {
  flex-shrink: 0;
  /* Sits on the bottom edge of the board, clear of the arch's lower border,
     rather than trailing the last prayer row. */
  margin-top: auto;
  padding-top: 0.5em;
  text-align: center;
  font-size: 1.15em;
  font-weight: 600;
  color: v-bind(textMuted);
  letter-spacing: 0.04em;
  pointer-events: none;
  z-index: 5;
}

/* ── Column header ───────────────────────────── */
.l5-col-header {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.5fr) minmax(0, 1.5fr);
  align-items: center;
  padding: clamp(5px, 0.7vw, 9px) clamp(34px, 7vh, 68px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  z-index: 5;
}

.l5-ch-prayer {
  font-size: 1.2em;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: v-bind(textColor);
  font-weight: 700;
}

.l5-ch-time {
  font-size: 1.2em;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: v-bind(textColor);
  font-weight: 700;
  text-align: center;
}

/* ── Rows ────────────────────────────────────── */
.l5-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 5;
}

.l5-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.3em clamp(34px, 7vh, 68px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  transition: background 0.3s;
}

.l5-row.active {
  background: v-bind(activeRowBg);
  box-shadow: inset 5px 0 0 v-bind(accentColor);
  border-radius: 0.5em;
  border-bottom-color: transparent;
}

.l5-row-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.5fr) minmax(0, 1.5fr);
  align-items: center;
}

.l5-pname {
  font-size: 2.46em;
  font-weight: 700;
  color: v-bind(textColor);
  line-height: 1;
}

/* The name carries the accent in the active row; the times stay plain so the
   row does not turn into a block of gold. */
.l5-row.active .l5-pname {
  color: v-bind(accentColor);
}

.l5-ptime {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.16em;
  font-size: v-bind(adhanSize);
  font-weight: 600;
  color: v-bind(textColor);
  text-align: center;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.l5-ptime-wide {
  grid-column: 2 / 4;
  font-size: max(v-bind(adhanSize), v-bind(iqamahSize));
}

.l5-time-num {
  line-height: 1;
}

.l5-period {
  font-size: 0.34em;
  line-height: 1;
  letter-spacing: 0.08em;
  font-weight: 800;
  font-feature-settings: normal;
}

.l5-ptime.period-inline {
  gap: 0.22em;
}

.l5-ptime.period-inline .l5-period {
  font-size: 0.44em;
  align-self: baseline;
  transform: translateY(-0.03em);
}

.l5-ptime.period-top {
  align-items: flex-start;
}

.l5-ptime.period-top .l5-period {
  padding-top: 0.08em;
}

.l5-ptime.period-bottom {
  align-items: flex-end;
}

.l5-ptime.period-bottom .l5-period {
  padding-bottom: 0.08em;
}

.l5-ptime.period-badge {
  gap: 0.24em;
}

.l5-ptime.period-badge .l5-period {
  align-self: center;
  padding: 0.26em 0.34em 0.2em;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  letter-spacing: 0.04em;
}

.l5-gold {
  font-size: v-bind(iqamahSize) !important;
  color: v-bind(textColor) !important;
}

/* ── Khateeb sub-line (inside a Jumu'ah row) ── */
.l5-speaker-line {
  display: flex;
  align-items: baseline;
  gap: clamp(6px, 0.8vw, 12px);
  padding: 0 0 clamp(6px, 0.9vw, 12px);
}
.l5-speaker-label {
  font-size: clamp(11px, 1.4vw, 20px);
  font-weight: 700;
  letter-spacing: .1em;
  color: v-bind(accentColor);
}
.l5-speaker-name {
  font-size: clamp(13px, 1.8vw, 26px);
  font-weight: 600;
  opacity: .9;
}

/* ── Sunrise row ─────────────────────────────
   Not a prayer, so it reads a step quieter than the rows around it and shows a
   dash where an iqamah would be, rather than leaving the column looking broken. */
.l5-row-sunrise {
  flex: 0 0 auto;
  padding-top: 0.35em;
  padding-bottom: 0.35em;
}

.l5-sunrise-name {
  font-size: 1.7em;
  font-weight: 600;
  color: v-bind(textMuted);
}

.l5-row-sunrise .l5-sunrise-time {
  font-size: 1.9em;
  font-weight: 600;
  color: v-bind(textMuted);
}

.l5-row-sunrise .l5-sunrise-dash {
  font-size: 1.9em;
  color: v-bind(textMuted);
  opacity: 0.6;
}

/* ── Tomorrow iqamah change (per-prayer, inline) ─ */
.l5-iqamah-change-line {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.5fr) minmax(0, 1.5fr);
  align-items: center;
  padding-bottom: clamp(6px, 0.9vw, 12px);
}

.l5-iqamah-change-content {
  grid-column: 1 / 4;
  display: flex;
  align-items: center;
  justify-content: v-bind(messageJustify);
  gap: clamp(10px, 1.5vw, 20px);
}

.l5-iqamah-change-label {
  font-size: 1.44em;
  color: v-bind(accentColor);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.l5-iqamah-change-time {
  font-size: 1.68em;
  color: v-bind(accentColor);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic, which Inter does not. */
.l5-root[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms apart. */
[dir='rtl'] .l5-date-greg,
[dir='rtl'] .l5-date-hijri,
[dir='rtl'] .l5-ch-prayer,
[dir='rtl'] .l5-ch-time,
[dir='rtl'] .l5-pname,
[dir='rtl'] .l5-next-label,
[dir='rtl'] .l5-foot,
[dir='rtl'] .l5-iqamah-change-label {
  letter-spacing: 0;
}
/* The clock's digits read left-to-right in Arabic too, and the seconds belong
   *after* them - but the ص/م marker belongs on the Arabic side, to their left.
   Flipping the whole row put the seconds on the left of the hour, so the row runs
   LTR and only the marker is re-ordered. (margin-inline-* would be Chrome 87+.) */
[dir='rtl'] .l5-clock {
  direction: ltr;
}
[dir='rtl'] .l5-clock-period {
  order: -1;
  margin-left: 0;
  margin-right: 0.3em;
}
[dir='rtl'] .l5-clock-sec {
  margin-left: 0.3em;
  margin-right: 0;
}
[dir='rtl'] .l5-next-end { text-align: left; }
/* Times are Latin numerals; keep them running left-to-right. The AM/PM marker sits
   outside .l5-time-num, so it still lands on the Arabic side of the digits. */
/* The active row's accent edge marks the start of the row, which is the right
   side in Arabic. box-shadow has no logical form, so it is mirrored here. */
[dir='rtl'] .l5-row.active {
  box-shadow: inset -5px 0 0 v-bind(accentColor);
}
[dir='rtl'] .l5-clock-hm,
[dir='rtl'] .l5-clock-sec,
[dir='rtl'] .l5-time-num,
[dir='rtl'] .l5-next-time,
[dir='rtl'] .l5-sunrise-time,
[dir='rtl'] .l5-iqamah-change-time {
  direction: ltr;
  unicode-bidi: isolate;
}

</style>
