<!--
  The focus screen — the full-screen "next prayer" view every layout alternates to,
  and the adhan takeover that replaces it while the adhan plays.

  Designed on Classic Ivory (layout-3) and shared from there: one screen, one set of
  far-distance type sizes, one palette. A layout supplies the prayer it is pinned to
  and its own accent; everything else — the dial, the two-stage countdown pill, the
  OLED ground, the night dimmer, the bedside bar — lives here.

  The Prayer Frame (layout-11) draws its own screens and does not use this component.

  The screen owns no view state: whether it is up is the layout's business (the
  alternation clock, the night focus, the iqamah hold and a manual swipe all feed
  `active`). See utils/focusScreen.js for the maths behind `pillTarget`/`adhanPassed`.
-->
<template>
  <div
    class="fs-root"
    :dir="dir"
    :class="{
      active,
      'fs-athan': athan,
      'fs-overlay-dark': overlayDark,
      'fs-ink': focusInkDark,
      'is-adhan-called': adhanPassed,
      'is-iqamah-pill': pillTarget === 'iqamah',
      'has-dial': analogClock,
    }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="tapStart = null"
  >
    <template v-if="analogClock">
      <div class="fs-dial">
        <AnalogClock :now="now" :show-seconds="showSeconds" :label="clock" />
      </div>
      <div class="fs-dates">
        <div class="fs-date">{{ gregorianDate }}</div>
        <div class="fs-hijri" v-if="showHijri">{{ hijriDate }}</div>
      </div>
    </template>
    <div class="fs-clock" v-if="!analogClock">
      <div class="fs-time">
        <span class="fs-hm">{{ clockParts.hm }}</span><span
          v-if="clockParts.sec" class="fs-sec">:{{ clockParts.sec }}</span><span
          v-if="clockParts.period" class="fs-period">{{ clockParts.period }}</span>
      </div>
      <div class="fs-date">{{ gregorianDate }}</div>
      <div class="fs-hijri" v-if="showHijri">{{ hijriDate }}</div>
    </div>

    <!-- ── Adhan takeover: the countdown to iqamah is the headline ───────────── -->
    <template v-if="athan">
      <div class="fs-name fs-athan-name">{{ prayer?.name || '--' }}</div>
      <div class="fs-athan-cd-label">{{ T.iqamahIn }}</div>
      <div class="fs-athan-cd">{{ athanCountdown }}</div>
      <div class="fs-times fs-athan-times" :class="{ 'fs-times-wide': timesWide }">
        <div class="fs-block">
          <div class="fs-blabel">{{ T.adhanCaps }}</div>
          <div class="fs-btime fs-athan-btime">{{ prayer?.adhan || '--:--' }}</div>
        </div>
        <div class="fs-divider"></div>
        <div class="fs-block">
          <div class="fs-blabel">{{ T.iqamahCaps }}</div>
          <div class="fs-btime fs-athan-btime fs-gold">{{ prayer?.iqamah || '--:--' }}</div>
        </div>
      </div>
      <button
        type="button"
        class="fs-mute"
        :class="{ muted: isAthanMuted }"
        :aria-label="isAthanMuted ? T.unmute : T.mute"
        :title="isAthanMuted ? T.unmute : T.mute"
        @click="emit('toggle-athan-mute')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path :d="isAthanMuted ? ICON.volumeOff : ICON.volumeUp" />
        </svg>
      </button>
    </template>

    <!-- ── Focus view ────────────────────────────────────────────────────────── -->
    <template v-else>
      <div class="fs-label">{{ T.next }}</div>
      <div class="fs-name" :class="{ 'is-jumuah': prayer?.isJumuah }">{{ prayer?.name || '--' }}</div>
      <div class="fs-speaker" v-if="prayer?.speaker">{{ prayer.speaker }}</div>
      <!-- Two-stage countdown: to the adhan, then to the iqamah once it is called. -->
      <div class="fs-pill" v-if="countdown">
        <span class="fs-pill-dot" aria-hidden="true"></span>
        <span class="fs-pill-label">{{ countdownLabel }}</span>
        <span class="fs-pill-time">{{ countdown }}</span>
      </div>
      <template v-if="prayer?.isJumuah">
        <div class="fs-khutbah-label">{{ T.khutbahStartsAt }}</div>
        <div class="fs-khutbah-time">{{ prayer.iqamah || '--:--' }}</div>
      </template>
      <div class="fs-times" :class="{ 'fs-times-wide': timesWide }" v-else>
        <div class="fs-block fs-block-adhan">
          <div class="fs-blabel">
            {{ T.adhanCaps }}
            <span class="fs-called-badge" v-if="adhanPassed">{{ T.called }}</span>
          </div>
          <div class="fs-btime">{{ prayer?.adhan || '--:--' }}</div>
        </div>
        <div class="fs-divider"></div>
        <div class="fs-block fs-block-iqamah">
          <div class="fs-blabel">{{ T.iqamahCaps }}</div>
          <div class="fs-btime fs-gold">{{ prayer?.iqamah || '--:--' }}</div>
        </div>
      </div>

      <!-- Bedside bar: tap the screen to reveal, auto-hides. Pointer-only, so a
           remote-driven board never sees it. -->
      <div class="fs-bedside" :class="{ shown: bedsideShown }" @pointerdown.stop @pointerup.stop>
        <button type="button" class="fs-bedside-btn" :class="{ on: oledBlack }" @click="toggleOled">
          {{ T.oledBlack }}
        </button>
        <label class="fs-bedside-dim">
          <span>{{ T.dim }}</span>
          <input type="range" min="30" max="100" step="5" :value="Math.round(focusDim * 100)" @input="onDimInput" />
          <span class="fs-bedside-val">{{ Math.round(focusDim * 100) }}%</span>
        </label>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import AnalogClock from './AnalogClock.vue'
import { formatClock, formatHijriLocalized } from '../utils/prayerTime.js'
import { toRgba, relativeLuminance, readableOn } from '../utils/colorAdjust.js'
import { useLayoutLang } from '../utils/layoutI18n.js'

const props = defineProps({
  /** The layout decides when the screen is up — see the file header. */
  active: { type: Boolean, default: false },
  /** 'athan' swaps the layout for the adhan takeover: countdown to iqamah + mute. */
  mode:   { type: String, default: 'focus' },
  /** The prayer the screen is pinned to: { name, adhan, iqamah, speaker, isJumuah },
   *  already formatted and localized by the layout. */
  prayer: { type: Object, default: null },
  /** The board's clock — passed in so the screen follows debug time travel. */
  now:    { type: Date, required: true },
  lang:   { type: String, default: 'en' },

  // ── Countdown, from useFocusScreen() in the layout ────────────────────────
  countdown:   { type: String, default: '' },
  /** 'adhan' | 'iqamah' | 'khutbah' | null — what the pill is counting to. */
  pillTarget:  { type: String, default: null },
  /** A fact, not a preference: the focused prayer's adhan time is behind us. */
  adhanPassed: { type: Boolean, default: false },
  /** The adhan takeover's headline countdown (HH:MM:SS to this prayer's iqamah). */
  athanCountdown: { type: String, default: '--:--:--' },
  isAthanMuted:   { type: Boolean, default: false },

  // ── Ground ────────────────────────────────────────────────────────────────
  // Scrim colour and how far it covers the board; dark mode keeps its own night ground.
  focusBg:      { type: String, default: '#000000' },
  focusOpacity: { type: [Number, String], default: '0.88' },
  // 'on' carries the board's background photo onto the focus screen, under the scrim.
  focusPhoto:   { type: String, default: 'off' },
  photoImage:   { type: String, default: '' },
  // 'oled' paints the screen pure #000 instead of deep slate, so an OLED panel emits
  // nothing at all from the background. Also togglable from the bedside bar.
  focusOled:    { type: String, default: 'off' },
  // Content brightness, 0.3-1. Dims the content, never the ground, so OLED stays black.
  focusDimDefault: { type: [Number, String], default: 1 },
  /** The board's night window is open (or the all-night Fajr focus is holding). */
  overlayDark:  { type: Boolean, default: false },
  // 'analog' puts the dial on the leading edge; 'digital' keeps the corner readout.
  focusClock:   { type: String, default: 'analog' },

  // ── Type ──────────────────────────────────────────────────────────────────
  /** The layout's accent, lifted to something legible on the focus ground. Empty
   *  keeps the ivory amber the screen was designed around. */
  accentColor: { type: String, default: '' },
  adhanScale:  { type: [Number, String], default: '1' },
  iqamahScale: { type: [Number, String], default: '1' },
  timeFormat:  { type: String, default: '12' },
  hijriOffset: { type: Number, default: 0 },
  showSeconds: { type: Boolean, default: true },
  showHijri:   { type: Boolean, default: true },
})

const emit = defineEmits(['toggle-athan-mute'])

const EXTRA = {
  en: { called: 'CALLED', oledBlack: 'OLED black', dim: 'Dim' },
  ar: { called: 'رُفِع',  oledBlack: 'أسود كامل',   dim: 'الإضاءة' },
}
const { dir, lang, T, localeTag } = useLayoutLang(props, EXTRA)

const ICON = {
  volumeUp: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
}

const athan = computed(() => props.mode === 'athan')
const hour12 = computed(() => props.timeFormat !== '24')

const clock = computed(() =>
  formatClock(props.now, { hour12: hour12.value, seconds: props.showSeconds, locale: localeTag.value })
)
/** The focus clock is the one element read from across a dark room, so its seconds
 *  get their own (quieter) face. "1:55:43 AM" → { hm: '1:55', sec: '43', period: ' AM' }. */
const clockParts = computed(() => {
  const m = /^(\d{1,2}:\d{2})(?::(\d{2}))?(.*)$/.exec(String(clock.value).trim())
  if (!m) return { hm: clock.value, sec: '', period: '' }
  return { hm: m[1], sec: m[2] || '', period: m[3] || '' }
})
const gregorianDate = computed(() =>
  props.now.toLocaleDateString(localeTag.value, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)
// Month names come from our own table: some WebViews lack Islamic month data and
// fall back to Gregorian names (Jumada al-Awwal rendering as "May").
const hijriDate = computed(() => formatHijriLocalized(props.now, props.hijriOffset, lang.value))

const analogClock = computed(() => String(props.focusClock || 'analog') !== 'digital')

const countdownLabel = computed(() => {
  if (props.pillTarget === 'khutbah') return T.value.khutbahIn
  return props.pillTarget === 'iqamah' ? T.value.iqamahIn : T.value.adhanIn
})

/** "15:25" is a third wider than "9:25": at this display size the pair runs to the
 *  edges of a 1080p board and crowds the divider. Four digits get a smaller face. */
const isWideTime = t => String(t || '').replace(/\D/g, '').length >= 4
const timesWide = computed(() =>
  isWideTime(props.prayer?.adhan) || isWideTime(props.prayer?.iqamah)
)

// ── Palette ─────────────────────────────────────────────────────────────────
// The screen's own tokens, so every child reads one place and the light-scrim
// variant only redefines a few values. The amber is the layout's accent lifted to
// something legible on the focus ground — a bronze or a deep teal chosen to look
// right as a fill on the board reads as mud at this size on near-black.
const IVORY_AMBER = '#F5C156'
const fsAmber = computed(() => {
  const accent = String(props.accentColor || '').trim()
  if (!/^#/.test(accent)) return IVORY_AMBER
  return readableOn(accent, '#0A0D12', IVORY_AMBER, 6)
})
const fsAmberSoft = computed(() => toRgba(fsAmber.value, 0.62))
/** The light-scrim variant mixes the same accent the other way, toward the ink. */
const fsAmberInk = computed(() => {
  const accent = String(props.accentColor || '').trim()
  if (!/^#/.test(accent)) return '#8A6A1F'
  return readableOn(accent, props.focusBg || '#FFFFFF', '#11161F', 4.5)
})
const fsAmberInkSoft = computed(() => toRgba(fsAmberInk.value, 0.55))
/** The pill and the bedside toggle wear the accent at two fixed strengths. */
const pillWash = computed(() => toRgba(fsAmber.value, 0.12))
const pillEdge = computed(() => toRgba(fsAmber.value, 0.35))

// ── Ground ──────────────────────────────────────────────────────────────────
// A light scrim would swallow the white type, so the ink flips below a usable
// contrast — unless dark mode is on, which keeps its own palette.
const focusAlpha = computed(() => {
  const n = Number(props.focusOpacity)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.88
})
const focusScrim = computed(() => toRgba(props.focusBg || '#000000', focusAlpha.value))
const isDefaultFocusBg = computed(() => {
  const bg = String(props.focusBg || '#000000').trim().toLowerCase()
  return bg === '#000000' || bg === '#000'
})
// With the switch on, the screen stands on the same photo as the board, with the
// scrim laid over it — so the opacity above doubles as the photo's dimmer.
const focusGround = computed(() => {
  const photo = String(props.photoImage || '').trim()
  if (props.focusPhoto !== 'on' || !photo) {
    // Left on the default black scrim, the screen stands on its own solid ground: a
    // deep midnight slate, or true #000 for OLED panels. A board that *chose* a focus
    // colour keeps it — only the untouched default is replaced.
    if (isDefaultFocusBg.value) return oledBlack.value ? '#000000' : '#0A0D12'
    return focusScrim.value
  }
  return `linear-gradient(${focusScrim.value}, ${focusScrim.value}), url("${photo}") center / cover no-repeat`
})
/** Dark mode / night focus ground. A board with a focus photo keeps it; one with a
 *  custom focus colour keeps the night gradient it has always had. */
const overlayDarkGround = computed(() => {
  if (props.focusPhoto === 'on' && String(props.photoImage || '').trim()) return focusGround.value
  if (isDefaultFocusBg.value) return oledBlack.value ? '#000000' : '#0A0D12'
  return 'linear-gradient(160deg, #0D1117 0%, #111720 60%, #0B0F15 100%)'
})
const focusInkDark = computed(() =>
  !props.overlayDark &&
  focusAlpha.value >= 0.45 &&
  relativeLuminance(props.focusBg || '#000000') > 0.55
)

// ── Bedside controls ────────────────────────────────────────────────────────
// Both start from the layout's settings and are remembered per display once touched,
// so a frame keeps the brightness its owner chose across reloads. The keys are not
// per-layout on purpose: it is one physical display's black level and brightness,
// and switching the board's layout should not reset them.
const LS_OLED = 'l3_focus_oled'
const LS_DIM  = 'l3_focus_dim'
const readStored = key => { try { return localStorage.getItem(key) } catch (_) { return null } }
const writeStored = (key, value) => { try { localStorage.setItem(key, value) } catch (_) {} }

const clampDim = v => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0.3, Math.min(1, n)) : 1
}
const oledBlack = ref(readStored(LS_OLED) != null
  ? readStored(LS_OLED) === 'on'
  : String(props.focusOled) === 'oled' || String(props.focusOled) === 'on')
const focusDim = ref(clampDim(readStored(LS_DIM) ?? props.focusDimDefault))
// A settings change from the toolbar outranks what this display stored earlier.
watch(() => props.focusOled, v => {
  oledBlack.value = String(v) === 'oled' || String(v) === 'on'
  writeStored(LS_OLED, oledBlack.value ? 'on' : 'off')
})
watch(() => props.focusDimDefault, v => {
  focusDim.value = clampDim(v)
  writeStored(LS_DIM, String(focusDim.value))
})
const focusDimCss = computed(() => String(focusDim.value))

const bedsideShown = ref(false)
let bedsideTimer = null
function revealBedside() {
  bedsideShown.value = true
  if (bedsideTimer) clearTimeout(bedsideTimer)
  bedsideTimer = setTimeout(() => { bedsideShown.value = false }, 8000)
}
function toggleOled() {
  oledBlack.value = !oledBlack.value
  writeStored(LS_OLED, oledBlack.value ? 'on' : 'off')
  revealBedside()
}
function onDimInput(e) {
  focusDim.value = clampDim(Number(e.target.value) / 100)
  writeStored(LS_DIM, String(focusDim.value))
  revealBedside()
}

// A tap that goes nowhere calls up the bedside bar; anything longer or further is
// the layout's swipe, which this screen leaves alone (the events bubble on up).
const tapStart = ref(null)
function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  tapStart.value = { x: e.clientX, y: e.clientY, t: Date.now() }
}
function onPointerUp(e) {
  const start = tapStart.value
  tapStart.value = null
  if (!start || athan.value || !props.active) return
  if (Math.abs(e.clientX - start.x) < 10 && Math.abs(e.clientY - start.y) < 10
      && Date.now() - start.t < 500) revealBedside()
}

onUnmounted(() => { if (bedsideTimer) clearTimeout(bedsideTimer) })
</script>

<style scoped>
* { box-sizing: border-box; }

.fs-root {
  /* The Prayer Frame's typeface, so the full-screen views read as one family. Cairo
     also covers Arabic, which Inter does not — the RTL focus screen used to fall back. */
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', sans-serif;
  position: absolute;
  inset: 0;
  background: v-bind(focusGround);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease;
  z-index: 20;
  /* Night palette: warm off-white on deep slate, with a soft amber for the iqamah.
     Pure white and pure blue-grey both read as glare across a dark room. */
  --fs-fg:    #F3F1EB;
  --fs-muted: #8E96A4;
  --fs-amber: v-bind(fsAmber);
  --fs-amber-soft: v-bind(fsAmberSoft);
  --fs-amber-wash: v-bind(pillWash);
  --fs-amber-edge: v-bind(pillEdge);
  color: var(--fs-fg);
}
.fs-root.active { opacity: 1; pointer-events: auto; }
/* Dim the content, never the ground: on OLED the background stays truly off. */
.fs-root > *:not(.fs-bedside) { filter: brightness(v-bind(focusDimCss)); }
/* Every digit on this screen is tabular, so nothing shuffles as the seconds tick. */
.fs-time,
.fs-btime,
.fs-khutbah-time,
.fs-athan-cd,
.fs-pill-time { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

/* Sit the block above centre: the times are large, and dead-centring leaves the name
   low with a pool of dead space underneath. */
.fs-root:not(.fs-athan) { padding-top: clamp(24px, 5vh, 86px); }

.fs-clock {
  position: absolute;
  top: clamp(20px, 4vh, 48px);
  right: clamp(28px, 4vw, 60px);
  text-align: right;
}
/* ── Analog dial ─────────────────────────────────────────────────────────────
   Pinned to the leading top corner and out of the flow, so the centred block below
   keeps the whole width and is not pushed off-centre. The vw cap keeps it clear of
   the prayer times on narrow boards, where a vh-only size would grow into them.
   Physical properties with an explicit RTL flip: Lightning CSS lowers inset-inline-*
   through :lang(), and the layouts set their direction with the dir attribute. */
.fs-root.has-dial { --fs-dial: clamp(195px, min(36vh, 22vw), 460px); }
.fs-dial {
  position: absolute;
  left: clamp(24px, 3vw, 56px);
  top: clamp(20px, 3.5vh, 44px);
  width: var(--fs-dial);
  color: var(--fs-fg);
}
.fs-dial > svg { width: var(--fs-dial); height: var(--fs-dial); }
[dir='rtl'] .fs-dial { left: auto; right: clamp(24px, 3vw, 56px); }

/* Dates take the opposite corner — the slot the digital clock holds. */
.fs-dates {
  position: absolute;
  top: clamp(20px, 4vh, 48px);
  right: clamp(28px, 4vw, 60px);
  text-align: right;
  padding: clamp(12px, 1.7vh, 23px) clamp(16px, 1.9vw, 32px);
  border: 2px solid var(--fs-amber-soft);
  border-radius: clamp(14px, 1.6vw, 26px);
  background: rgba(255, 255, 255, 0.03);
}
[dir='rtl'] .fs-dates { 
  right: auto; 
  left: clamp(28px, 4vw, 60px); 
  text-align: left; 
  padding: 6px;
}
.fs-dates .fs-date {
  color: var(--fs-fg);
  opacity: 0.92;
  font-size: clamp(1.25rem, 2.05vw, 2.05rem);
  font-weight: 500;
  margin-top: 0;
}
.fs-dates .fs-hijri {
  color: var(--fs-amber);
  opacity: 1;
  font-size: clamp(1.2rem, 1.8vw, 1.8rem);
  font-weight: 500;
  margin-top: clamp(9px, 1.3vh, 18px);
}

/* Read from a bed, 10-15 feet out: the hero of this screen after the prayer times. */
.fs-time {
  font-size: clamp(2.5rem, 5vw, 4.75rem);
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--fs-fg);
  white-space: nowrap;
}
/* Seconds are motion, not information — they sit back so the hour reads first. */
.fs-sec { opacity: 0.75; font-weight: 400; }
.fs-period {
  opacity: 0.75;
  font-weight: 400;
  font-size: 0.5em;
  margin-inline-start: 0.12em;
}
.fs-date {
  font-size: clamp(0.9rem, 1.9vh, 1.1rem);
  color: var(--fs-muted);
  margin-top: 6px;
}
.fs-hijri {
  font-size: clamp(0.9rem, 1.9vh, 1.1rem);
  color: var(--fs-muted);
  opacity: 0.85;
  margin-top: 2px;
}

.fs-speaker {
  font-size: clamp(40px, 6vh, 80px);
  font-weight: 600;
  color: #E8D9BC;
  margin-top: clamp(4px, 0.8vh, 10px);
  text-align: center;
}

.fs-khutbah-label {
  font-size: clamp(22px, 2.4vw, 34px);
  font-weight: 600;
  letter-spacing: .2em;
  color: var(--fs-amber-soft);
  margin-top: clamp(14px, 2.6vh, 34px);
}

.fs-khutbah-time {
  font-family: 'Inter', sans-serif;
  font-size: calc(clamp(56px, 11vh, 150px) * v-bind(iqamahScale));
  font-weight: 700;
  line-height: 1.05;
  color: var(--fs-amber);
}

.fs-label {
  font-size: clamp(0.95rem, 1.45vw, 1.3rem);
  color: var(--fs-muted);
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: clamp(14px, 2.6vh, 32px);
}
.fs-name {
  font-size: clamp(3.3rem, 7.1vw, 7.1rem);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-bottom: clamp(14px, 2vh, 22px);
  color: var(--fs-fg);
}
.fs-name.is-jumuah { font-size: clamp(2.3rem, 4.2vw, 4.3rem); line-height: 1.1; }

/* ── Two-stage countdown pill ─────────────────────────────────────────────── */
.fs-pill {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1.8rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(243, 241, 235, 0.15);
  color: var(--fs-fg);
  margin-bottom: clamp(20px, 3.4vh, 44px);
  /* The switch at adhan time is a state change, not a jump cut. */
  transition: background 0.6s ease, border-color 0.6s ease, color 0.6s ease;
}
.fs-pill-label {
  font-size: clamp(1.1rem, 1.6vw, 1.5rem);
  letter-spacing: 0.18em;
  font-weight: 500;
  opacity: 0.8;
}
.fs-pill-time {
  font-size: clamp(2.2rem, 3.4vw, 3.2rem);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.fs-pill-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}
/* The pill is counting to an iqamah — gold, whether or not the adhan has been called. */
.is-iqamah-pill .fs-pill {
  color: var(--fs-amber);
  background: var(--fs-amber-wash);
  border-color: var(--fs-amber-edge);
}
.is-iqamah-pill .fs-pill-dot { animation: fs-pulse 2.6s ease-in-out infinite; }
@keyframes fs-pulse {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 1; }
}
/* The adhan has been called: still on the board, no longer the thing to look at. */
.is-adhan-called .fs-block-adhan { opacity: 0.35; }
.fs-block { transition: opacity 0.6s ease; }
.is-adhan-called .fs-block-iqamah { opacity: 1; }
.fs-block-iqamah { opacity: 0.85; transition: opacity 0.6s ease; }
.fs-called-badge {
  display: inline-block;
  margin-inline-start: 0.5em;
  padding: 0.12em 0.55em;
  border-radius: 9999px;
  border: 1px solid currentColor;
  font-size: 0.62em;
  letter-spacing: 0.14em;
  vertical-align: middle;
}
.fs-times {
  display: flex;
  align-items: center;
  gap: clamp(24px, 4vw, 90px);
}
.fs-block { text-align: center; }
.fs-blabel {
  font-size: clamp(1.15rem, 1.75vw, 1.75rem);
  color: var(--fs-muted);
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: clamp(6px, 1.2vh, 14px);
}
.fs-btime {
  font-weight: 500;
  color: var(--fs-fg);
  line-height: 1;
}
.fs-root:not(.fs-athan) .fs-btime {
  font-size: calc(clamp(6.9rem, 16vw, 18.1rem) * v-bind(adhanScale));
}
.fs-root:not(.fs-athan) .fs-btime.fs-gold {
  font-size: calc(clamp(6.9rem, 16vw, 18.1rem) * v-bind(iqamahScale));
}
/* "15:25" is a third wider than "9:25" — four digits either side would run to the
   board's edges, so the wide pair steps down a size. */
.fs-root:not(.fs-athan) .fs-times-wide .fs-btime {
  font-size: calc(clamp(6.9rem, 16vw, 18.1rem) * v-bind(adhanScale) * 0.72);
}
.fs-root:not(.fs-athan) .fs-times-wide .fs-btime.fs-gold {
  font-size: calc(clamp(6.9rem, 16vw, 18.1rem) * v-bind(iqamahScale) * 0.72);
}

.fs-gold { color: var(--fs-amber); font-weight: 500; }
.fs-divider {
  width: 1px;
  height: clamp(60px, 12vh, 160px);
  background: rgba(255, 255, 255, 0.12);
}
.fs-root:not(.fs-athan) .fs-divider { height: clamp(80px, 17vh, 225px); }

/* ── Light scrim ─────────────────────────────────────────────────────────────
   A pale focus colour needs dark type: the whole token set flips, pill and badge
   included. Dark mode is declared after this, so night still wins when both apply. */
.fs-root.fs-ink { color: #11161F; }
.fs-ink .fs-time,
.fs-ink .fs-name,
.fs-ink .fs-btime   { color: #11161F; }
.fs-ink .fs-date    { color: rgba(17, 22, 31, 0.72); }
.fs-ink .fs-hijri   { color: rgba(17, 22, 31, 0.6); }
.fs-ink .fs-divider { background: rgba(17, 22, 31, 0.18); }
.fs-ink .fs-athan-name,
.fs-ink .fs-athan-cd      { color: #11161F; }
.fs-ink .fs-speaker       { color: rgba(17, 22, 31, 0.8); }
.fs-root.fs-ink {
  --fs-fg:    #11161F;
  --fs-muted: rgba(17, 22, 31, 0.6);
  --fs-amber: v-bind(fsAmberInk);
  --fs-amber-soft: v-bind(fsAmberInkSoft);
  --fs-amber-wash: rgba(17, 22, 31, 0.08);
  --fs-amber-edge: rgba(17, 22, 31, 0.3);
}
.fs-ink .fs-pill {
  background: rgba(17, 22, 31, 0.06);
  border-color: rgba(17, 22, 31, 0.18);
}

/* ── Bedside bar ─────────────────────────────────────────────────────────────
   Tap-to-reveal, auto-hiding: a display nobody touches never shows it. */
.fs-bedside {
  position: absolute;
  bottom: clamp(16px, 3vh, 36px);
  left: 50%;
  transform: translateX(-50%) translateY(8px);
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 28px);
  padding: 0.5rem 1.1rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(243, 241, 235, 0.12);
  color: var(--fs-fg);
  font-size: clamp(0.7rem, 1vw, 0.9rem);
  letter-spacing: 0.08em;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.fs-bedside.shown { opacity: 0.6; pointer-events: auto; transform: translateX(-50%) translateY(0); }
.fs-bedside.shown:hover { opacity: 1; }
.fs-bedside-btn {
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
  background: transparent;
  border: 1px solid rgba(243, 241, 235, 0.25);
  border-radius: 9999px;
  padding: 0.25rem 0.8rem;
  cursor: pointer;
}
.fs-bedside-btn.on {
  color: var(--fs-amber);
  border-color: var(--fs-amber-edge);
  background: var(--fs-amber-wash);
}
.fs-bedside-dim {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.fs-bedside-dim input { width: clamp(80px, 10vw, 150px); accent-color: v-bind(fsAmber); }
.fs-bedside-val { font-variant-numeric: tabular-nums; min-width: 3.2em; text-align: end; }

/* ── Dark ground ─────────────────────────────────────────────────────────────
   Used whenever dark mode is on, and always during the all-night Fajr focus. The
   palette itself is the focus screen's own at every hour — see the tokens above —
   so only the ground changes here. */
.fs-root.fs-overlay-dark { background: v-bind(overlayDarkGround); }

/* ── Adhan takeover ──────────────────────────────────────────────────────────
   Same ground as the focus screen, but the countdown to iqamah is the headline and
   the adhan/iqamah pair shrinks to a supporting row. */
.fs-root.fs-athan { z-index: 25; }
.fs-athan-name {
  font-size: clamp(3rem, 7vh, 5rem);
  margin-bottom: clamp(6px, 1.2vh, 14px);
}
.fs-athan-cd-label {
  font-size: clamp(20px, 2vw, 26px);
  color: var(--fs-amber);
  font-weight: 400;
  letter-spacing: 6px;
  text-transform: uppercase;
  margin-bottom: clamp(4px, 0.8vh, 10px);
}
.fs-overlay-dark .fs-athan-cd-label { color: #7A9CC7; }
.fs-athan-cd {
  font-size: clamp(4rem, 17vh, 9rem);
  font-weight: 400;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  color: #ffffff;
  margin-bottom: clamp(16px, 3vh, 44px);
  direction: ltr;
}
.fs-overlay-dark .fs-athan-cd { color: #E8E0D4; }
.fs-athan-times { gap: clamp(32px, 5vw, 96px); }
.fs-athan .fs-athan-btime {
  font-size: calc(clamp(5rem, 17.5vh, 8.5rem) * v-bind(adhanScale));
}
.fs-athan .fs-athan-btime.fs-gold {
  font-size: calc(clamp(5rem, 17.5vh, 8.5rem) * v-bind(iqamahScale));
}
.fs-athan .fs-times-wide .fs-athan-btime {
  font-size: calc(clamp(5rem, 17.5vh, 8.5rem) * v-bind(adhanScale) * 0.8);
}
.fs-athan .fs-times-wide .fs-athan-btime.fs-gold {
  font-size: calc(clamp(5rem, 17.5vh, 8.5rem) * v-bind(iqamahScale) * 0.8);
}
.fs-athan .fs-divider { height: clamp(80px, 15vh, 170px); }

/* Mute: the only control on the screen, so it gets a generous target. */
.fs-mute {
  position: absolute;
  bottom: clamp(20px, 4vh, 52px);
  right: clamp(28px, 4vw, 60px);
  width: clamp(56px, 9vh, 92px);
  height: clamp(56px, 9vh, 92px);
  margin: 0;
  padding: 0;
  font: inherit;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  transition: background 0.2s, color 0.2s;
}
.fs-mute svg { width: 58%; height: 58%; fill: currentColor; }
.fs-mute.muted { background: var(--fs-amber); color: #1A1208; }
.fs-overlay-dark .fs-mute { background: rgba(232, 224, 212, 0.14); color: #E8E0D4; }
.fs-overlay-dark .fs-mute.muted { background: var(--fs-amber); color: #0D1117; }

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Arabic is cursive: the tracked-out Latin labels would pull the joined letterforms
   apart, so letter-spacing is dropped wherever the script is RTL. */
[dir='rtl'] .fs-label,
[dir='rtl'] .fs-blabel,
[dir='rtl'] .fs-name,
[dir='rtl'] .fs-athan-cd-label {
  letter-spacing: 0;
}
/* Times and countdowns are Latin numerals; keep them running left-to-right. */
[dir='rtl'] .fs-btime,
[dir='rtl'] .fs-khutbah-time,
[dir='rtl'] .fs-pill-time {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>

<style scoped>
/* Chromium 83 (cheap Rockchip frames) has no logical properties, and the lowered
   fallback the tooling emits relies on `:is()`/level-4 `:not()`, which it also lacks.
   Physical property above, explicit mirror here. */
[dir='rtl'] .fs-mute { right: auto; left: clamp(28px, 4vw, 60px); }
</style>
