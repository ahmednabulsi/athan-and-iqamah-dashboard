<!--
  PrayerInterrupt — the countdown and athan screens, for every layout that does not
  draw its own.

  App.vue renders this above the active layout, so a layout needs no changes to gain
  the behaviour. Layout 3 (Classic Ivory) and Layout 11 (Prayer Frame) have screens
  designed into them and are excluded by App.vue; all three honour the same
  Countdown For / Countdown Lead settings.

      countdown  the configured lead time before an athan and/or iqamah
      athan      while the adhan audio plays, plus a grace window when it is silent

  A horizontal swipe dismisses either screen. Dismissing the athan screen also stops
  the audio — leaving it playing behind the schedule is never what the swipe meant;
  the mute button is the way to keep the screen but silence it.
-->
<template>
  <div
    v-if="screen"
    class="pi-root"
    :dir="dir"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="swipeStart = null"
  >
    <div class="pi-label">{{ eventLabel }}</div>
    <div class="pi-name">{{ eventPrayerName }}</div>

    <!-- ── Countdown ── -->
    <div v-if="screen === 'countdown'" class="pi-ring" :class="{ 'is-final': ring.final }">
      <svg viewBox="-200 -200 400 400" aria-hidden="true">
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   :stop-color="accentColor" stop-opacity="0.55" />
            <stop offset="100%" :stop-color="accentColor" stop-opacity="1" />
          </linearGradient>
        </defs>
        <g transform="rotate(-90)">
          <circle class="pi-track" :r="RING_R" />
          <circle
            class="pi-arc"
            :r="RING_R"
            :stroke="`url(#${gradId})`"
            :stroke-dasharray="`${ring.arc} ${RING_LEN}`"
            stroke-dashoffset="0"
          />
          <circle class="pi-head" :cx="ring.headX" :cy="ring.headY" r="11" />
        </g>
      </svg>
      <div class="pi-secs" :class="`pi-len-${ring.text.length}`">{{ ring.text }}</div>
    </div>
    <div v-if="screen === 'countdown'" class="pi-target">{{ targetLine.label }} <span class="pi-target-time">{{ targetLine.time }}</span></div>

    <!-- ── Athan ── -->
    <template v-else>
      <div class="pi-pill">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="ICON.hearing" /></svg>
        <span>{{ CAPTION }}</span>
      </div>
      <button
        v-if="isAthanPlaying"
        type="button"
        class="pi-mute"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { debugNow, clockOffsetMs, useDebugClock } from '../utils/debugClock.js'
import { getPrayerDateTime, formatClock } from '../utils/prayerTime.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { countdownKinds, countdownLeadMs, findNextEvent, countdownText, PRAYER_ORDER }
  from '../utils/prayerCountdown.js'

const props = defineProps({
  prayerData:    Object,
  baseDate:      { type: Date, default: () => new Date() },
  lang:          { type: String, default: 'en' },
  accentColor:   { type: String, default: '#8fd8a8' },
  isAthanPlaying: { type: Boolean, default: false },
  isAthanMuted:   { type: Boolean, default: false },
  countdownFor:     { type: String, default: 'athan' },
  countdownLeadMin: { type: [Number, String], default: 1 },
  timeFormat:       { type: String, default: '12' },
  // Which screens this instance owns. Layout 3 draws its own athan takeover but has
  // no countdown of its own, so it takes ['countdown'] only.
  screens: { type: Array, default: () => ['countdown', 'athan'] },
  /** Changes when the board is swiped, to undo a dismissal within the window. */
  restoreToken: { type: Number, default: 0 },
})

const emit = defineEmits(['toggle-athan-mute', 'stop-athan'])

const { dir, T } = useLayoutLang(props, {
  en: {
    timeFor: kind => `Time for ${kind === 'iqamah' ? 'Iqamah' : 'Athan'}`,
    at: kind => `${kind === 'iqamah' ? 'Iqamah' : 'Adhan'} at`,
  },
  ar: {
    timeFor: kind => `حان موعد ${kind === 'iqamah' ? 'الإقامة' : 'الأذان'}`,
    at: kind => `${kind === 'iqamah' ? 'الإقامة' : 'الأذان'} الساعة`,
  },
})

const CAPTION = 'الله أكبر الله أكبر'
const RING_R = 176
const RING_LEN = 2 * Math.PI * RING_R
/** Grace window after an adhan time during which the screen still shows even when
 *  no audio played (sound off, or alerts disabled). Matches the Prayer Frame. */
const SILENT_ADHAN_MS = 90_000

const ICON = {
  hearing: 'M17 20c-.29 0-.56-.06-.76-.15-.71-.37-1.21-.88-1.71-2.38-.51-1.56-1.47-2.29-2.39-3-.79-.61-1.61-1.24-2.32-2.53C9.29 10.98 9 9.93 9 9c0-2.8 2.2-5 5-5s5 2.2 5 5h2c0-3.93-3.07-7-7-7S7 5.07 7 9c0 1.26.38 2.65 1.07 3.9.91 1.65 1.98 2.48 2.85 3.15.81.62 1.39 1.07 1.71 2.05.6 1.82 1.37 2.84 2.73 3.55.51.23 1.07.35 1.64.35 2.21 0 4-1.79 4-4h-2c0 1.1-.9 2-2 2zM7.64 2.64 6.22 1.22C4.23 3.21 3 5.96 3 9s1.23 5.79 3.22 7.78l1.41-1.41C6.01 13.74 5 11.49 5 9s1.01-4.74 2.64-6.36zM11.5 9c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5-2.5 1.12-2.5 2.5z',
  volumeUp: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
  volumeOff: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
}

// A one-second tick drives the state machine; the ring gets its own frame loop so it
// sweeps smoothly, and only while the countdown is actually up.
const now     = ref(debugNow())
const fineNow = ref(Date.now() + clockOffsetMs.value)
let tick = null, ringFrame = null

onMounted(() => { tick = setInterval(() => { now.value = debugNow() }, 1000) })
onUnmounted(() => {
  clearInterval(tick)
  if (ringFrame != null) cancelAnimationFrame(ringFrame)
})

const resolve = (key, kind) => {
  const raw = props.prayerData?.[`${key}_${kind}`]
  if (!raw) return null
  const p = PRAYER_ORDER.find(x => x.key === key)
  return getPrayerDateTime(raw, p.isFajr, p.isDhuhr, props.baseDate)
}

const leadMs = computed(() => countdownLeadMs(props.countdownLeadMin))
const nextEvent = computed(() =>
  props.prayerData ? findNextEvent(resolve, countdownKinds(props.countdownFor), now.value) : null
)

/** The most recent athan that has already passed today. */
const lastAthan = computed(() => {
  if (!props.prayerData) return null
  let found = null
  for (const { key } of PRAYER_ORDER) {
    const t = resolve(key, 'azaan')
    if (t && t <= now.value) found = { key, at: t }
  }
  return found
})

const athanActive = computed(() => {
  if (props.isAthanPlaying) return true
  if (!lastAthan.value) return false
  return now.value.getTime() - lastAthan.value.at.getTime() < SILENT_ADHAN_MS
})

const countdownActive = computed(() => {
  if (!leadMs.value || !nextEvent.value) return false
  const left = nextEvent.value.at.getTime() - now.value.getTime()
  return left > 0 && left <= leadMs.value
})

/** Identity of the interrupt on screen, so a dismissal applies to that one
 *  occurrence and the next athan/countdown still comes through. */
const interruptKey = computed(() => {
  if (athanActive.value) return `athan:${lastAthan.value?.at.getTime() ?? 'live'}`
  if (countdownActive.value) return `cd:${nextEvent.value.kind}:${nextEvent.value.at.getTime()}`
  return null
})
const dismissed = ref(null)
watch(interruptKey, k => { if (k === null) dismissed.value = null })
// Bumped by App.vue when the viewer swipes on the board: a dismissal is meant to
// get out of the way, not to close the screen for the rest of its window.
watch(() => props.restoreToken, () => { dismissed.value = null })

const owns = kind => props.screens.includes(kind)

const screen = computed(() => {
  if (dismissed.value !== null && dismissed.value === interruptKey.value) return null
  // The athan still suppresses our countdown even when another component draws it,
  // so the two never stack on top of each other.
  if (athanActive.value) return owns('athan') ? 'athan' : null
  if (countdownActive.value && owns('countdown')) return 'countdown'
  return null
})

const eventKind = computed(() =>
  screen.value === 'athan' ? 'azaan' : (nextEvent.value?.kind || 'azaan')
)
const eventPrayerName = computed(() => {
  const key = screen.value === 'athan'
    ? (lastAthan.value?.key || nextEvent.value?.key)
    : nextEvent.value?.key
  return key ? T.value[key] : ''
})
const eventLabel = computed(() => T.value.timeFor(eventKind.value))

// ── Ring ────────────────────────────────────────────────────────────────────
watch(screen, s => {
  if (s === 'countdown' && ringFrame == null) {
    const loop = () => { fineNow.value = Date.now() + clockOffsetMs.value; ringFrame = requestAnimationFrame(loop) }
    ringFrame = requestAnimationFrame(loop)
  } else if (s !== 'countdown' && ringFrame != null) {
    cancelAnimationFrame(ringFrame)
    ringFrame = null
  }
})

const ring = computed(() => {
  const span = (leadMs.value || 60_000) / 1000
  const left = Math.max(0, ((nextEvent.value?.at.getTime() ?? 0) - fineNow.value) / 1000)
  const f = Math.max(0, Math.min(1, left / span))
  // Leading end of the arc, so the sweep reads as a moving head rather than a bare edge.
  const a = f * 2 * Math.PI
  return {
    arc: f * RING_LEN,
    text: countdownText(Math.ceil(left - 1e-6)),
    final: left <= 10,
    headX: RING_R * Math.cos(a),
    headY: RING_R * Math.sin(a),
  }
})

/** Several layouts can mount this; a shared gradient id would collide in the DOM. */
const gradId = `pi-grad-${Math.random().toString(36).slice(2, 8)}`

/** "Adhan at 5:31" — what the countdown is actually running toward. The clock is kept
 *  as its own run so RTL does not strip the AM/PM off the end of it. */
const targetLine = computed(() => {
  const at = nextEvent.value?.at
  if (!at) return { label: '', time: '' }
  return {
    label: T.value.at(eventKind.value),
    time: formatClock(at, { hour12: props.timeFormat !== '24', seconds: false }),
  }
})

// ── Swipe to dismiss ────────────────────────────────────────────────────────
const SWIPE_MIN_PX = 60
const SWIPE_MAX_MS = 1500
const swipeStart = ref(null)

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
  // Horizontal intent only, so a stray vertical drag doesn't dismiss the screen.
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  dismissed.value = interruptKey.value
  if (props.isAthanPlaying) emit('stop-athan')
}

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
.pi-root {
  position: fixed;
  inset: 0;
  z-index: 900;              /* above every layout, below the swipe-free app chrome */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 1.6vh, 20px);
  background: radial-gradient(ellipse at 50% 38%, #141c26 0%, #0A0D12 72%);
  color: #F3F1EB;
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', system-ui, sans-serif;
  touch-action: none;        /* let horizontal swipes reach the handlers */
  animation: pi-in 220ms ease-out;
}
@keyframes pi-in { from { opacity: 0 } to { opacity: 1 } }

.pi-label {
  font-size: clamp(0.95rem, 2.4vh, 1.7rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 500;
  color: v-bind(accentColor);
  opacity: 0.9;
}
.pi-name {
  font-size: clamp(2.2rem, 8vh, 6rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.05;
  white-space: nowrap;
  color: #F3F1EB;
  margin-bottom: clamp(4px, 1vh, 14px);
}

/* ── Countdown ring ── */
/* The number inside is what has to carry the room, so the ring is sized to give it
   room rather than to look like a badge. */
.pi-ring {
  position: relative;
  width: clamp(220px, 52vh, 620px);
  height: clamp(220px, 52vh, 620px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pi-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
/* A faint disc so the numerals sit on something rather than floating in the ring. */
.pi-ring::before {
  content: '';
  position: absolute;
  inset: 11%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 42%, rgba(255,255,255,0.055), rgba(255,255,255,0.012) 70%);
}
.pi-track, .pi-arc { fill: none; stroke-width: 9; stroke-linecap: round; }
.pi-track { stroke: rgba(243, 241, 235, 0.09); }
.pi-arc   { filter: drop-shadow(0 0 14px rgba(245, 193, 86, 0.3)); }
/* The sweep's leading end, so the ring reads as moving even in a still glance. */
.pi-head {
  fill: v-bind(accentColor);
  filter: drop-shadow(0 0 12px rgba(245, 193, 86, 0.75));
}

.pi-secs {
  position: relative;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  font-weight: 500;
  letter-spacing: -0.01em;
  direction: ltr;            /* Latin numerals, even in Arabic */
  unicode-bidi: isolate;
  /* The value runs from "9" to "14:59" over a 15-minute lead; one size cannot hold
     both, and the long form used to spill straight through the ring. */
  font-size: clamp(4.4rem, 24vh, 17.5rem);
  max-width: 80%;
}
.pi-len-3 { font-size: clamp(3.8rem, 20vh, 14.5rem); }
.pi-len-4 { font-size: clamp(3.3rem, 17.5vh, 13rem); }
.pi-len-5 { font-size: clamp(2.7rem, 14vh, 10.4rem); }
.pi-len-6 { font-size: clamp(2.4rem, 11.5vh, 8.6rem); }

/* What the countdown is running toward — the screen says more than a bare number. */
.pi-target {
  margin-top: clamp(10px, 2.2vh, 30px);
  font-size: clamp(1.05rem, 3vh, 2.1rem);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: v-bind(accentColor);
  font-variant-numeric: tabular-nums;
}
/* Keep the clock one bidi run: in Arabic the AM/PM was being split off its time. */
.pi-target-time { direction: ltr; unicode-bidi: isolate; }

/* The last ten seconds breathe, so a glance catches that it is nearly up. */
.pi-ring.is-final .pi-arc  { animation: pi-pulse 1s ease-in-out infinite; }
.pi-ring.is-final .pi-secs { animation: pi-pulse 1s ease-in-out infinite; }
@keyframes pi-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.55 } }

/* ── Athan ── */
.pi-pill {
  display: flex;
  align-items: center;
  gap: 0.6em;
  margin-top: clamp(8px, 2vh, 24px);
  padding: clamp(8px, 1.4vh, 16px) clamp(18px, 2.6vw, 34px);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: clamp(1.1rem, 3.4vh, 2.6rem);
}
.pi-pill svg { width: 1.1em; height: 1.1em; fill: v-bind(accentColor); flex: 0 0 auto; }

.pi-mute {
  position: absolute;
  bottom: clamp(20px, 5vh, 56px);
  left: clamp(20px, 5vw, 56px);
  width: clamp(56px, 9vh, 96px);
  height: clamp(56px, 9vh, 96px);
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #ECEFF3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.pi-mute svg { width: 58%; height: 58%; fill: currentColor; }
.pi-mute.muted { background: v-bind(accentColor); color: #0D1117; }

/* Arabic is cursive: the Latin-tracked label would pull the letterforms apart. */
[dir='rtl'] .pi-label, [dir='rtl'] .pi-name { letter-spacing: 0; }
</style>

<style scoped>
/* See Layout11/Layout3: Chromium 83 drops both the logical property and its
   lowered `:is()`-based fallback, so the element loses its offset entirely. */
[dir='rtl'] .pi-mute { left: auto; right: clamp(20px, 5vw, 56px); }
</style>
