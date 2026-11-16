<!--
  EventsScreen — masjid events on the board, for every layout.

  Like PrayerInterrupt, App.vue renders this above the active layout so no layout
  needs changing. Three faces, never more than one at once:

      bands       the week, grouped by day — the board's default events slide
      spotlight   one featured event at headline size, the rest beside it; taken
                  in turns with the bands face when the feed flags a favourite
      afterAthan  the gap between an athan and its iqamah, showing what is left
                  today *alongside the iqamah countdown* — that window is when the
                  board is most wanted for the iqamah time, so the countdown stays

  All three yield to the countdown and athan screens, which App.vue enforces by
  not rendering this while one of those is up.

  Colour comes from the running layout. A screen that painted its own dark ground
  made the rotation flash on a light layout (ivory -> near-black -> ivory every
  third slot); the photo-backed layouts pass no palette and keep the dark ground,
  which is what suits them.
-->
<template>
  <div
    v-if="face"
    class="ev-root"
    :class="{ 'ev-root-athan': face === 'afterAthan', 'ev-themed': themed }"
    :style="groundStyle"
    :dir="dir"
  >

    <!-- ══════════ WEEK — A: day bands ══════════ -->
    <template v-if="face === 'week' && variant === 'bands'">
      <header class="ev-head">
        <h2>{{ T.weekTitle }}</h2>
        <span class="ev-range">{{ rangeLabel }}</span>
      </header>

      <div class="ev-days">
        <section v-for="day in dayGroups" :key="day.key" class="ev-day-group">
          <div class="ev-dayline">
            <span v-if="day.isToday" class="ev-daypip">{{ T.today }} &middot; {{ day.short }}</span>
            <span v-else class="ev-dayname">{{ day.long }}</span>
          </div>
          <div class="ev-entries">
            <div v-for="(e, i) in day.items" :key="i" class="ev-entry">
              <div class="ev-etime">
                {{ e.timeNum }}<small v-if="e.timePeriod">{{ e.timePeriod }}</small>
              </div>
              <div class="ev-ebody">
                <div class="ev-ename">
                  <span v-if="e.featured" class="ev-star">&#9733; {{ T.featured }}</span>{{ e.title }}
                </div>
                <div v-if="e.venue" class="ev-evenue">{{ e.venue }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- ══════════ WEEK — B: spotlight ══════════ -->
    <template v-else-if="face === 'week'">
      <div class="ev-spot">
        <div class="ev-lead">
          <div class="ev-kicker">
            <span class="ev-dot"></span>{{ hero.featured ? T.featured : T.nextUp }} &middot; {{ hero.dayLong }}
          </div>
          <h2 class="ev-lead-title">{{ hero.title }}</h2>
          <div class="ev-lead-when">{{ hero.time }}</div>
          <div class="ev-lead-rule"></div>
          <div v-if="hero.venue" class="ev-lead-where">{{ hero.venue }}</div>
        </div>
        <div class="ev-rest">
          <div class="ev-rest-label">{{ T.alsoThisWeek }}</div>
          <div
            v-for="(e, i) in restItems"
            :key="i"
            class="ev-mini"
            :class="{ 'ev-mini-today': e.isToday }"
          >
            <div class="ev-mini-day">{{ e.isToday ? T.today : e.dayShort }}</div>
            <div>
              <div class="ev-mini-name">{{ e.title }}</div>
              <div class="ev-mini-meta">{{ e.time }}<template v-if="e.venue"> &middot; {{ e.venue }}</template></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ AFTER ATHAN ══════════ -->
    <template v-else>
      <header class="ev-head ev-head-athan">
        <span class="ev-kicker-athan">{{ countdownLabel || T.iqamahIn }}</span>
        <div class="ev-countdown">{{ iqamahCountdown }}</div>
      </header>
      <h2 class="ev-sub">{{ T.todayTitle }}</h2>
      <ul class="ev-list ev-list-athan">
        <li v-for="(e, i) in todayItems" :key="i" class="ev-item" :class="{ 'ev-featured': e.featured }">
          <span class="ev-time ev-time-lead">{{ e.time }}</span>
          <span class="ev-body">
            <span class="ev-title">
              <span v-if="e.featured" class="ev-badge">&#9733; {{ T.featured }}</span>
              {{ e.title }}
            </span>
            <span v-if="e.venue" class="ev-venue">{{ e.venue }}</span>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { useLayoutLang } from '../utils/layoutI18n.js'
import { eventTime, sameDay } from '../utils/eventsFeed.js'
import { mixHex, hexToRgb, readableOn, isOpaqueColor } from '../utils/colorAdjust.js'

const props = defineProps({
  /** 'week' | 'afterAthan' | '' — App.vue decides which face is due. */
  face:        { type: String, default: '' },
  events:      { type: Array,  default: () => [] },
  lang:        { type: String, default: 'en' },
  accentColor: { type: String, default: '#4FC3BD' },
  /** The running layout's ground and ink. Empty keeps the built-in dark ground,
   *  which is what the photo-backed layouts want. */
  bgColor:     { type: String, default: '' },
  textColor:   { type: String, default: '' },
  timeFormat:  { type: String, default: '12' },
  /** Seconds to the next iqamah, for the after-athan face. null hides the clock. */
  secondsToIqamah: { type: Number, default: null },
  /** Overrides the "Iqamah in" kicker — on Friday it is a khutbah, not an iqamah. */
  countdownLabel: { type: String, default: '' },
  /** Counts the slide's appearances, so the two week faces take turns. */
  turn:        { type: Number, default: 0 },
  maxItems:    { type: Number, default: 4 },
})

const { dir, T, localeTag } = useLayoutLang(props, {
  en: {
    weekTitle: 'This week at the masjid', todayTitle: 'Later today',
    iqamahIn: 'Iqamah in', allDay: 'All day',
    today: 'TODAY', featured: 'FEATURED', nextUp: 'NEXT UP',
    alsoThisWeek: 'Also this week',
  },
  ar: {
    weekTitle: 'هذا الأسبوع في المسجد', todayTitle: 'لاحقاً اليوم',
    iqamahIn: 'الإقامة بعد', allDay: 'طوال اليوم',
    today: 'اليوم', featured: 'مميز', nextUp: 'التالي',
    alsoThisWeek: 'أيضاً هذا الأسبوع',
  },
})

const hour12 = computed(() => props.timeFormat !== '24')

// The board can sit on one face across midnight, so "today" has to be re-evaluated
// rather than captured when the screen mounted.
const now = ref(debugNow())
let dayTimer = null
onMounted(() => { dayTimer = setInterval(() => { now.value = debugNow() }, 60000) })
onUnmounted(() => clearInterval(dayTimer))

// ── Palette ─────────────────────────────────────────────────────────────────
// Derived with plain RGB maths rather than color-mix(), which the older WebViews
// on some of these boxes do not support.
const themed = computed(() => isOpaqueColor(props.bgColor))
const ink    = computed(() => (themed.value ? (props.textColor || '#ECEFF3') : '#ECEFF3'))
const ground = computed(() =>
  themed.value ? props.bgColor : 'radial-gradient(ellipse at 50% 20%, #16202A 0%, #080B10 72%)'
)
/**
 * The ground goes on inline, and `.ev-root` carries a static dark background under it,
 * so a value that turns out not to paint falls back to something opaque instead of
 * leaving the slide see-through over the board. [themed] already rejects a transparent
 * colour; this is the backstop for whatever else a layout may hand over one day.
 */
const groundStyle = computed(() => (
  themed.value
    ? { backgroundColor: ground.value, backgroundImage: 'none' }
    : { backgroundColor: '#0B0F14', backgroundImage: ground.value }
))
/** A card tint that holds on an ivory ground as well as a near-black one. */
const surface = computed(() =>
  themed.value ? mixHex(props.bgColor, ink.value, 0.07) : 'rgba(255, 255, 255, 0.05)'
)
const muted = computed(() =>
  themed.value ? mixHex(props.bgColor, ink.value, 0.58) : '#8EA0AD'
)
const line = computed(() => {
  const { r, g, b } = hexToRgb(themed.value ? ink.value : '#FFFFFF')
  return `rgba(${r}, ${g}, ${b}, 0.16)`
})
const accentWash = computed(() => {
  const { r, g, b } = hexToRgb(props.accentColor)
  return `rgba(${r}, ${g}, ${b}, 0.13)`
})
/** Text that sits *on* the accent (the TODAY pill). */
const onAccent = computed(() => (themed.value ? props.bgColor : '#0A0E13'))
/** The accent as *label text*. An ivory board's gold is 2.3:1 against its own
 *  ground — fine as a fill, unreadable as a word. */
const accentInk = computed(() =>
  themed.value ? readableOn(props.accentColor, props.bgColor, ink.value, 4) : props.accentColor
)

// ── Rows ────────────────────────────────────────────────────────────────────
const splitTime = e => {
  const full = eventTime(e, { hour12: hour12.value, locale: localeTag.value, allDayLabel: T.value.allDay })
  const m = full.match(/^(.*?)\s*(AM|PM|ص|م)$/i)
  return m ? { timeNum: m[1], timePeriod: m[2], time: full } : { timeNum: full, timePeriod: '', time: full }
}

const shape = e => ({
  title: e.title,
  venue: e.venue,
  featured: !!e.featured,
  isToday: sameDay(e.start, now.value),
  dayNum: e.start.toLocaleDateString(localeTag.value, { day: 'numeric' }),
  dayShort: e.start.toLocaleDateString(localeTag.value, { weekday: 'short' }),
  dayLong: e.start.toLocaleDateString(localeTag.value, { weekday: 'long' }),
  ...splitTime(e),
})

/** The next few events, except that a featured one inside the window always gets a
 *  slot — the masjid flags those precisely because they should not scroll past. It
 *  takes the last slot and the list stays chronological. */
const weekEvents = computed(() => {
  const shown = props.events.slice(0, props.maxItems)
  const featured = props.events.find(e => e.featured)
  if (featured && !shown.includes(featured)) {
    shown.splice(props.maxItems - 1, 1, featured)
    shown.sort((a, b) => a.start - b.start)
  }
  return shown
})
const weekItems = computed(() => weekEvents.value.map(shape))
const todayItems = computed(() => props.events.slice(0, 2).map(shape))

/** Day bands: the same rows, grouped under the day they fall on. */
const dayGroups = computed(() => {
  const groups = []
  for (const e of weekItems.value) {
    const key = `${e.dayLong}-${e.dayNum}`
    let g = groups.find(x => x.key === key)
    if (!g) {
      g = {
        key,
        isToday: e.isToday,
        short: e.dayShort,
        long: `${e.dayLong} ${e.dayNum}`,
        items: [],
      }
      groups.push(g)
    }
    g.items.push(e)
  }
  return groups
})

// ── Which week face ─────────────────────────────────────────────────────────
// Bands is the default; the spotlight takes every other turn, and only when the
// feed actually flags something — otherwise there is no hero to lead with.
const heroEvent = computed(() =>
  weekItems.value.find(e => e.featured) || weekItems.value[0] || null
)
const variant = computed(() =>
  weekItems.value.some(e => e.featured) && props.turn % 2 === 1 && weekItems.value.length > 1
    ? 'spotlight'
    : 'bands'
)
const hero = computed(() => heroEvent.value || { title: '', time: '', dayLong: '', venue: '', featured: false })
const restItems = computed(() => weekItems.value.filter(e => e !== heroEvent.value).slice(0, 3))

const rangeLabel = computed(() => {
  if (!weekEvents.value.length) return ''
  const opts = { month: 'short', day: 'numeric' }
  const first = weekEvents.value[0].start
  const last = weekEvents.value[weekEvents.value.length - 1].start
  const a = first.toLocaleDateString(localeTag.value, opts)
  if (first.getMonth() === last.getMonth() && first.getDate() === last.getDate()) return a
  const sameMonth = first.getMonth() === last.getMonth()
  const b = last.toLocaleDateString(localeTag.value, sameMonth ? { day: 'numeric' } : opts)
  return `${a} – ${b}`
})

const iqamahCountdown = computed(() => {
  const s = props.secondsToIqamah
  if (s == null || s < 0) return '--:--'
  const total = Math.floor(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  // Isha can sit over an hour from its athan, and "66:28" reads as nonsense.
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
.ev-root {
  position: fixed;
  inset: 0;
  z-index: 880;              /* under the countdown/athan screens (900) */
  display: flex;
  flex-direction: column;
  padding: 4.5vh 5vw;
  gap: 2.2vh;
  /* Last-resort ground: [groundStyle] paints the real one inline. Never remove this -
     it is what stops the slide rendering transparently over the board. */
  background: #0B0F14;
  color: v-bind(ink);
  font-family: 'Cairo', 'Noto Sans Arabic', 'Inter', system-ui, sans-serif;
  touch-action: none;        /* let horizontal swipes reach the handlers */
  animation: ev-in 260ms ease-out;
}
@keyframes ev-in { from { opacity: 0 } to { opacity: 1 } }
/* The week faces fill the height; the after-athan face is a short block, so
   centre it rather than stranding it against the top edge. */
.ev-root-athan { justify-content: center; gap: 1.4vh; }

.ev-head { display: flex; align-items: baseline; justify-content: space-between; gap: 2vw; }
.ev-head h2 {
  margin: 0;
  font-size: clamp(2.7rem, 7.8vh, 6rem);
  font-weight: 700;
  line-height: 1.1;
}
.ev-range {
  font-size: clamp(1.2rem, 3.15vh, 2.25rem);
  letter-spacing: .14em;
  text-transform: uppercase;
  color: v-bind(accentInk);
  white-space: nowrap;
}

/* ── A: day bands ────────────────────────────────────────────────────────
   Grouping by day gives the week a shape before anyone reads a word, and the
   fixed time column lets the eye scan one edge instead of hunting across each row. */
.ev-days { display: flex; flex-direction: column; justify-content: space-evenly; gap: 2vh; flex: 1; min-height: 0; overflow: hidden; }
.ev-day-group { display: flex; flex-direction: column; gap: 1.1vh; }

.ev-dayline { display: flex; align-items: center; gap: 1.4vw; }
.ev-dayline::after { content: ""; flex: 1; height: 1px; background: v-bind(line); }
.ev-dayname {
  font-size: clamp(1.2rem, 3.4vh, 2.3rem);
  font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
  color: v-bind(accentInk);
}
.ev-daypip {
  padding: .25em .8em .3em;
  border-radius: 999px;
  background: v-bind(accentColor);
  color: v-bind(onAccent);
  font-size: clamp(1rem, 2.6vh, 1.9rem);
  font-weight: 800; letter-spacing: .14em; text-transform: uppercase;
}

.ev-entries { display: flex; flex-direction: column; gap: 1.2vh; }
.ev-entry { display: grid; grid-template-columns: 11vw 1fr; gap: 2vw; align-items: baseline; }
.ev-etime {
  font-size: clamp(1.9rem, 5.6vh, 3.6rem);
  font-weight: 700; line-height: 1.05;
  font-variant-numeric: tabular-nums;
  direction: ltr; unicode-bidi: isolate;
}
.ev-etime small {
  display: block;
  font-size: .42em; font-weight: 600; letter-spacing: .1em;
  color: v-bind(muted);
}
.ev-ebody { min-width: 0; }
.ev-ename {
  font-size: clamp(1.9rem, 5.6vh, 3.6rem);
  font-weight: 600; line-height: 1.15;
  /* Titles run to 69 characters in the feed; clamp rather than shrink. */
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ev-evenue { font-size: clamp(1.05rem, 3vh, 2.1rem); color: v-bind(muted); }
.ev-star {
  display: inline-block;
  margin-inline-end: .5em;
  padding: .1em .6em .16em;
  border-radius: 999px;
  border: .09em solid v-bind(accentInk);
  color: v-bind(accentInk);
  font-size: .46em; font-weight: 700; letter-spacing: .14em;
  vertical-align: .22em; white-space: nowrap;
}

/* ── B: spotlight ────────────────────────────────────────────────────────
   One event at a size that reads from the back of the hall; the rest of the
   week stays legible beside it. */
.ev-spot { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.35fr 1fr; grid-template-rows: 1fr; gap: 4vw; }
.ev-lead { display: flex; flex-direction: column; justify-content: center; gap: 1.6vh; min-width: 0; }
.ev-kicker {
  display: flex; align-items: center; gap: 1vw;
  font-size: clamp(1.1rem, 2.8vh, 2rem);
  font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
  color: v-bind(accentInk);
}
.ev-dot { width: .8vw; height: .8vw; max-width: 14px; max-height: 14px; border-radius: 50%; background: v-bind(accentColor); }
.ev-lead-title {
  margin: 0;
  font-size: clamp(2.6rem, 9.4vh, 7rem);
  font-weight: 700; line-height: 1.04; letter-spacing: -0.015em;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.ev-lead-when {
  font-size: clamp(1.8rem, 5.6vh, 4.2rem);
  font-weight: 700; font-variant-numeric: tabular-nums;
  direction: ltr; unicode-bidi: isolate;
}
.ev-lead-rule { height: .4vh; width: 9vw; border-radius: 999px; background: v-bind(accentColor); }
.ev-lead-where { font-size: clamp(1.1rem, 3.2vh, 2.3rem); color: v-bind(muted); }

.ev-rest { display: flex; flex-direction: column; justify-content: center; gap: 1.4vh; min-width: 0; }
.ev-rest-label {
  font-size: clamp(.9rem, 2.4vh, 1.7rem);
  font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
  color: v-bind(muted); margin-bottom: .4vh;
}
.ev-mini {
  display: grid; grid-template-columns: auto 1fr; gap: 1.6vw; align-items: baseline;
  background: v-bind(surface);
  border-radius: 1vh;
  padding: 1.6vh 1.8vw;
  border-inline-start: .35vw solid transparent;
}
.ev-mini-today { border-inline-start-color: v-bind(accentColor); }
.ev-mini-day {
  min-width: 4.6vw;
  font-size: clamp(.9rem, 2.4vh, 1.7rem);
  font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: v-bind(accentInk);
}
.ev-mini-name {
  font-size: clamp(1.1rem, 3.1vh, 2.3rem); font-weight: 600; line-height: 1.2;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ev-mini-meta { font-size: clamp(.85rem, 2.3vh, 1.6rem); color: v-bind(muted); font-variant-numeric: tabular-nums; }

/* ── After-athan face ───────────────────────────────────────────────────── */
.ev-head-athan { flex-direction: column; align-items: flex-start; gap: .4vh; }
.ev-kicker-athan {
  font-size: clamp(1.6rem, 4.4vh, 3.2rem);
  letter-spacing: .2em;
  text-transform: uppercase;
  color: v-bind(accentInk);
}
.ev-countdown {
  font-size: clamp(3rem, 15vh, 11rem);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  direction: ltr;
  unicode-bidi: isolate;
}
.ev-sub {
  margin: 0;
  font-size: clamp(2rem, 6vh, 4.4rem);
  font-weight: 600;
  color: v-bind(muted);
}

.ev-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.ev-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2.4vw;
  align-items: center;
  flex: 1 1 0;
  min-height: 0;
  padding: 1.2vh 0;
  border-top: 1px solid v-bind(line);
}
.ev-item:last-child { border-bottom: 1px solid v-bind(line); }

.ev-body { min-width: 0; display: flex; flex-direction: column; gap: .4vh; }
.ev-title {
  font-size: clamp(2.1rem, 6.4vh, 4.8rem);
  font-weight: 600;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ev-venue {
  font-size: clamp(1.5rem, 4.2vh, 3rem);
  color: v-bind(muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-time {
  font-size: clamp(2rem, 5.8vh, 4.2rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: v-bind(accentColor);
  white-space: nowrap;
}
.ev-badge {
  display: inline-block;
  margin-inline-end: .7vw;
  padding: .18em .62em .22em;
  border-radius: 999px;
  background: v-bind(accentColor);
  color: v-bind(onAccent);
  font-size: .5em;
  font-weight: 800;
  letter-spacing: .14em;
  vertical-align: .18em;
  white-space: nowrap;
}
.ev-item.ev-featured .ev-title { font-weight: 800; }

/* On the after-athan face the time leads the row instead of trailing it. */
.ev-list-athan { flex: 0 0 auto; }
.ev-list-athan .ev-item { grid-template-columns: auto 1fr; flex: 0 0 auto; padding: 1.6vh 0; }
.ev-time-lead { min-width: 5.5em; }

/* Arabic is cursive: the tracked-out Latin labels would pull the letterforms apart. */
[dir='rtl'] .ev-range, [dir='rtl'] .ev-kicker, [dir='rtl'] .ev-kicker-athan,
[dir='rtl'] .ev-dayname, [dir='rtl'] .ev-daypip, [dir='rtl'] .ev-star,
[dir='rtl'] .ev-badge, [dir='rtl'] .ev-rest-label, [dir='rtl'] .ev-mini-day { letter-spacing: 0; }

@media (prefers-reduced-motion: reduce) {
  .ev-root { animation: none; }
}
</style>
