<!--
  JumuahScreen — Friday's Jumu'ah sessions and their khateebs, for every layout.

  Like EventsScreen, App.vue renders this above the active layout, so no layout has
  to know about it: on Fridays it takes the same rotation slot the events card uses,
  and the two alternate when a mosque has both. It only ever appears when the
  jummah.php feed actually has sessions for this mosque, and it yields to the
  countdown and athan screens (App.vue enforces that by not rendering it).

  Classic Ivory also folds these sessions into its own schedule table in place of
  Dhuhr; this screen is the board-wide version for the layouts that have no room
  for them inline.
-->
<template>
  <div class="ju-root" :style="groundStyle" :dir="dir">
    <header class="ju-head">
      <h2>{{ T.jumuah }}</h2>
      <span class="ju-date">{{ dateLabel }}</span>
    </header>

    <ul class="ju-list">
      <li
        v-for="(s, i) in sessions"
        :key="i"
        class="ju-item"
        :class="{ 'ju-next': i === nextIndex }"
      >
        <span class="ju-body">
          <span class="ju-label">
            {{ s.label }}
            <span v-if="i === nextIndex" class="ju-chip">{{ T.nextUp }}</span>
          </span>
          <span v-if="s.speaker" class="ju-speaker">
            <span class="ju-speaker-label">{{ T.khateeb }}</span>
            {{ s.speaker }}
          </span>
        </span>
        <span class="ju-time">{{ s.time }}</span>
      </li>
    </ul>

    <div class="ju-foot" v-if="mosqueName">{{ mosqueName }}</div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { formatClock, getPrayerDateTime } from '../utils/prayerTime.js'
import { mixHex, hexToRgb, readableOn, isOpaqueColor } from '../utils/colorAdjust.js'

const props = defineProps({
  /** [{ label, time, speaker }] straight from the feed. */
  prayers:     { type: Array,  default: () => [] },
  lang:        { type: String, default: 'en' },
  accentColor: { type: String, default: '#4FC3BD' },
  /** The running layout's ground and ink; empty keeps the built-in dark ground. */
  bgColor:     { type: String, default: '' },
  textColor:   { type: String, default: '' },
  timeFormat:  { type: String, default: '12' },
  mosqueName:  { type: String, default: '' },
})

const { dir, T, localeTag } = useLayoutLang(props, {
  en: { khateeb: 'KHATEEB', nextUp: 'NEXT', tbd: 'To be announced' },
  ar: { khateeb: 'الخطيب', nextUp: 'التالية', tbd: 'يُعلن لاحقاً' },
})

// ── Palette ─────────────────────────────────────────────────────────────────
// Same treatment as the events slide: wear the layout's colours when it has a
// flat ground, keep the dark one for the photo-backed layouts.
const themed = computed(() => isOpaqueColor(props.bgColor))
const ink    = computed(() => (themed.value ? (props.textColor || '#ECEFF3') : '#ECEFF3'))
const ground = computed(() =>
  themed.value ? props.bgColor : 'radial-gradient(ellipse at 50% 18%, #17222C 0%, #080B10 72%)'
)
/** Inline, for the same reason as EventsScreen's - see the note there. */
const groundStyle = computed(() => (
  themed.value
    ? { backgroundColor: ground.value, backgroundImage: 'none' }
    : { backgroundColor: '#0B0F14', backgroundImage: ground.value }
))
const muted = computed(() =>
  themed.value ? mixHex(props.bgColor, ink.value, 0.58) : '#93A89A'
)
const line = computed(() => {
  const { r, g, b } = hexToRgb(themed.value ? ink.value : '#FFFFFF')
  return `rgba(${r}, ${g}, ${b}, 0.16)`
})
const accentWash = computed(() => {
  const { r, g, b } = hexToRgb(props.accentColor)
  return `rgba(${r}, ${g}, ${b}, 0.13)`
})
/** Text that sits on the accent chip. */
const onAccent = computed(() => (themed.value ? props.bgColor : '#0A0E13'))
/** The accent as label text, lifted off the ground where it would be too faint. */
const accentInk = computed(() =>
  themed.value ? readableOn(props.accentColor, props.bgColor, ink.value, 4) : props.accentColor
)

const now = ref(debugNow())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = debugNow() }, 30000) })
onUnmounted(() => clearInterval(timer))

/** Feed times are "12:15 PM"; re-format so a 24h board stays 24h. */
const asDate = t => getPrayerDateTime(t, false, true, now.value)
const sessions = computed(() => props.prayers.filter(p => p?.time).map(p => ({
  label: p.label || T.value.jumuah,
  speaker: p.speaker || '',
  time: formatClock(asDate(p.time), { hour12: props.timeFormat !== '24', seconds: false, locale: localeTag.value }),
})))

/** The session still ahead, so the board says which one people are waiting for. */
const nextIndex = computed(() =>
  props.prayers.filter(p => p?.time).findIndex(p => asDate(p.time) >= now.value)
)

const dateLabel = computed(() =>
  now.value.toLocaleDateString(localeTag.value, { weekday: 'long', month: 'short', day: 'numeric' })
)

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
.ju-root {
  position: fixed;
  inset: 0;
  z-index: 880;              /* under the countdown/athan screens (900) */
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4.5vh 5vw;
  gap: 2.4vh;
  /* Last-resort ground - see EventsScreen. [groundStyle] paints the real one inline. */
  background: #0B0F14;
  color: v-bind(ink);
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', system-ui, sans-serif;
  touch-action: none;        /* let horizontal swipes reach the handlers */
  animation: ju-in 260ms ease-out;
}
@keyframes ju-in { from { opacity: 0 } to { opacity: 1 } }

.ju-head { display: flex; align-items: baseline; justify-content: space-between; gap: 2vw; }
.ju-head h2 {
  margin: 0;
  font-size: clamp(2.7rem, 7.8vh, 6rem);
  font-weight: 700;
  line-height: 1.1;
}
.ju-date {
  font-size: clamp(1.2rem, 3.15vh, 2.25rem);
  letter-spacing: .14em;
  text-transform: uppercase;
  color: v-bind(accentInk);
  white-space: nowrap;
}

.ju-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.2vh; }
.ju-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2.4vw;
  align-items: center;
  padding: 2vh 0;
  border-top: 1px solid v-bind(line);
}
.ju-item:last-child { border-bottom: 1px solid v-bind(line); }

/* The session people are actually waiting for carries the screen. */
.ju-item.ju-next {
  background: v-bind(accentWash);
  box-shadow: inset 0.35vw 0 0 0 v-bind(accentColor);
  padding-left: 1.4vw;
  border-radius: .6vh;
}
[dir='rtl'] .ju-item.ju-next {
  box-shadow: inset -0.35vw 0 0 0 v-bind(accentColor);
  padding-left: 0;
  padding-right: 1.4vw;
}

.ju-body { min-width: 0; display: flex; flex-direction: column; gap: .8vh; }
.ju-label {
  font-size: clamp(1.8rem, 5vh, 3.8rem);
  font-weight: 700;
  line-height: 1.15;
}
.ju-chip {
  display: inline-block;
  margin-inline-start: .8vw;
  padding: .18em .62em .22em;
  border-radius: 999px;
  background: v-bind(accentColor);
  color: v-bind(onAccent);
  font-size: .42em;
  font-weight: 800;
  letter-spacing: .14em;
  vertical-align: .22em;
}
.ju-speaker {
  font-size: clamp(1.4rem, 3.9vh, 2.9rem);
  font-weight: 600;
  color: v-bind(ink);
}
.ju-speaker-label {
  margin-inline-end: .8vw;
  font-size: .55em;
  font-weight: 700;
  letter-spacing: .14em;
  color: v-bind(accentInk);
}

.ju-time {
  font-size: clamp(2.2rem, 6.4vh, 5rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: v-bind(accentInk);
  white-space: nowrap;
  direction: ltr;
  unicode-bidi: isolate;
}

.ju-foot {
  font-size: clamp(1.1rem, 2.8vh, 2rem);
  color: v-bind(muted);
  text-align: center;
}

/* Arabic is cursive: tracked-out Latin labels would pull the letterforms apart. */
[dir='rtl'] .ju-date, [dir='rtl'] .ju-chip, [dir='rtl'] .ju-speaker-label { letter-spacing: 0; }

@media (prefers-reduced-motion: reduce) {
  .ju-root { animation: none; }
}
</style>
