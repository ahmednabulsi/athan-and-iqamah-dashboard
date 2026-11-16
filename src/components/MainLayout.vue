<template>
  <div id="bg-layer">
    <div id="bg-image" class="night-dim" :style="bgImageStyle"></div>
    <div id="bg-backdrop"></div>
  </div>

  <div id="main-container" :dir="dir" :class="{ faded: showFocus }">
    <div id="left-panel">
      <div id="next-prayer-container">
        <div id="next-prayer-label">{{ T.next }}</div>
        <div id="next-prayer-name" :class="{ 'is-jumuah': nextCard?.isJumuah }">{{ nextPrayerName }}</div>
        <div id="next-speaker" v-if="nextCard?.speaker">{{ nextCard.speaker }}</div>
        <div class="prayer-time-section" v-if="nextCard?.isJumuah">
          <div class="pt-label">{{ T.khutbahStartsAt }}</div>
          <div id="next-iqamah-time">{{ nextIqamah }}</div>
        </div>
        <template v-else>
          <div class="prayer-time-section">
            <div class="pt-label">{{ T.adhanCaps }}</div>
            <div id="next-athan-time">{{ nextAdhan }}</div>
          </div>
          <div class="prayer-time-section">
            <div class="pt-label">{{ T.iqamahCaps }}</div>
            <div id="next-iqamah-time">{{ nextIqamah }}</div>
          </div>
        </template>
      </div>
      <div id="radio-bar" v-if="isRadioPlaying">
        <div id="radio-dot"></div>
        <div>
          <div id="radio-label">{{ T.nowPlaying }}</div>
          <div id="radio-name">{{ radioName }}</div>
        </div>
      </div>
    </div>

    <div id="right-panel">
      <div id="clock-container">
        <div id="current-time">{{ currentTime }}</div>
        <div id="current-date">{{ currentDate }}</div>
        <div id="current-hijri" v-if="showHijri">{{ currentHijriDate }}</div>
      </div>
      <PrayerGrid :prayers="prayerCards" :iqamah-label="T.iqamah" />
      <div id="status">{{ status }}</div>
    </div>
  </div>

  <div id="focus-view" :dir="dir" :class="{ active: showFocus }">
    <div id="focus-clock">
      <div id="focus-time">{{ currentTime }}</div>
      <div id="focus-date">{{ currentDate }}</div>
      <div id="focus-hijri" v-if="showHijri">{{ currentHijriDate }}</div>
    </div>
    <div id="focus-prayer-label">{{ T.next }}</div>
    <div id="focus-prayer-name" :class="{ 'is-jumuah': nextCard?.isJumuah }">{{ nextPrayerName }}</div>
    <div id="focus-speaker" v-if="nextCard?.speaker">{{ nextCard.speaker }}</div>
    <div id="focus-times-row" v-if="nextCard?.isJumuah">
      <div class="focus-time-block">
        <div class="focus-label">{{ T.khutbahStartsAt }}</div>
        <div id="focus-iqamah">{{ nextIqamah }}</div>
      </div>
    </div>
    <div id="focus-times-row" v-else>
      <div class="focus-time-block">
        <div class="focus-label">{{ T.adhanCaps }}</div>
        <div id="focus-athan">{{ nextAdhan }}</div>
      </div>
      <div class="focus-divider"></div>
      <div class="focus-time-block">
        <div class="focus-label">{{ T.iqamahCaps }}</div>
        <div id="focus-iqamah">{{ nextIqamah }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { boardPhase } from '../utils/viewRotation.js'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import PrayerGrid from './PrayerGrid.vue'
import { formatClock, formatHijri, getPrayerDateTime } from '../utils/prayerTime.js'
import { withJumuahRows, jumuahName, jumuahDate } from '../utils/jumuah.js'
import { useLayoutLang } from '../utils/layoutI18n.js'

const props = defineProps({
  prayerData:    Object,
  bgKey:         String,
  bgMap:         Object,
  nextPrayerKey: String,
  /** Friday's Jumu'ah sessions from the feed; empty on any other day or for a
   *  mosque the scraper does not cover, which leaves the schedule untouched. */
  jumuahPrayers: { type: Array, default: () => [] },
  // 'en' | 'ar' — flips every label and the text direction.
  lang:          { type: String, default: 'en' },
  radioName:     String,
  isRadioPlaying: Boolean,
  status:        String,
  timeFormat:    { type: String, default: '12' },
  hijriOffset:   { type: Number, default: 0 },
  showSeconds:   { type: Boolean, default: true },
  showHijri:     { type: Boolean, default: true },
  showSunrise:   { type: Boolean, default: true },
  showMosque:    { type: Boolean, default: true },
  backdropColor:   { type: String, default: '#000000' },
  backdropOpacity: { type: [Number, String], default: 0 },
  darkMode:        { type: Boolean, default: false },
})

const { lang, dir, T, localeTag, dateLocale } = useLayoutLang(props)

const showFocus  = ref(false)
const currentTime = ref('00:00')
const currentDate = ref('Loading...')

let clockInterval = null

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',   isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',  isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',    isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Magrib', isFajr: false, isDhuhr: false },
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

const prayerCards = computed(() => {
  const nk = props.nextPrayerKey
  const rows = PRAYERS.map(p => ({
    key:       p.key,
    name:      T.value[p.key],
    adhan:     prayerTime(p.key, '_azaan'),
    iqamah:    prayerTime(p.key, '_iqamah'),
    isCurrent: nk === p.key,
  }))
  // On Friday the Dhuhr card becomes one card per Jumu'ah session.
  return withJumuahRows(rows, props.jumuahPrayers, (dhuhr, s, i, isNext) => ({
    ...dhuhr,
    rowKey:    `jumuah-${i}`,
    name:      jumuahName(s, { lang: lang.value, index: i, count: props.jumuahPrayers.length, label: T.value.jumuah }),
    iqamah:    displayTime(jumuahDate(s.time)),
    speaker:   s.speaker || '',
    isCurrent: dhuhr.isCurrent && isNext,
  }))
})

const bgImageStyle = computed(() => {
  const bg     = props.bgMap?.[props.bgKey]
  const url    = bg?.url ?? (props.bgKey && props.bgKey !== 'none' ? `https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/${props.bgKey}.png` : null)
  const repeat = bg?.repeat ?? (props.bgKey?.startsWith?.('repeat') ?? false)
  if (!url) return {}
  return {
    backgroundImage:    `url("${url}")`,
    backgroundSize:     repeat ? 'auto'   : 'cover',
    backgroundRepeat:   repeat ? 'repeat' : 'no-repeat',
    backgroundPosition: repeat ? ''       : 'center',
  }
})

watchEffect(() => {
  const bg  = props.bgMap?.[props.bgKey]
  const url = bg?.url ?? (props.bgKey && props.bgKey !== 'none' ? `https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/${props.bgKey}.png` : null)
  document.body.classList.toggle('has-bg', !!url)
  Array.from(document.body.classList).filter(c => c.startsWith('bg-')).forEach(c => document.body.classList.remove(c))
  if (props.bgKey && props.bgKey !== 'none') document.body.classList.add(`bg-${props.bgKey}`)
})

const currentHijriDate = ref('')

function tick() {
  const now = debugNow()
  currentTime.value = formatClock(now, { hour12: hour12.value, seconds: props.showSeconds, hour: '2-digit', locale: localeTag.value })
  currentDate.value = now.toLocaleDateString(dateLocale.value, { weekday: 'long', month: 'long', day: 'numeric' })
  // The hijri line has always been rendered in Arabic here (Tajawal face), in both
  // languages — it reads as a calligraphic accent rather than a translated label.
  currentHijriDate.value = formatHijri(now, props.hijriOffset, 'ar-SA')
}

watchEffect(() => { lang.value; tick() })

// The focus view alternates on the board's shared rotation clock
// (utils/viewRotation.js), the same clock the events and Jumu'ah slides take their
// slot from, so neither screen is ever cut short by the other.
watch(boardPhase, () => { showFocus.value = boardPhase.value % 2 === 1 })

onMounted(() => {
  tick()
  clockInterval = setInterval(tick, 1000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  document.body.classList.remove('has-bg')
  Array.from(document.body.classList).filter(c => c.startsWith('bg-')).forEach(c => document.body.classList.remove(c))
})

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(tick)
</script>

<style>
/* ── BACKGROUND LAYER ── */
#bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
}
#bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-color: #0000008b;
}
#bg-backdrop {
  position: absolute;
  inset: 0;
  background: v-bind(backdropColor);
  opacity: v-bind(backdropOpacity);
  pointer-events: none;
}
body.light-mode #bg-image { background-color: #f0f0f08b; }

/* ── MAIN CONTAINER ── */
#main-container {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  transition: opacity 0.8s ease;
}
#main-container.faded { opacity: 0; pointer-events: none; }

/* ── FOCUS VIEW ── */
#focus-view {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease;
  z-index: 10;
}
#focus-view.active { opacity: 1; pointer-events: auto; }
#focus-clock { position: absolute; top: 5.5vh; right: 5vw; text-align: right; }
#focus-time  { font-size: clamp(2.5rem, 6vh, 5rem); font-weight: 700; line-height: 1; }
#focus-date  { font-size: clamp(1.5rem, 3vh, 3rem); margin-top: 5px; }
#focus-hijri { font-size: clamp(1.5rem, 3vh, 3rem); margin-top: 5px; font-family: 'Tajawal', sans-serif; }
#focus-prayer-label {
  font-size: clamp(0.85rem, 1.8vh, 1.3rem); color: #cd7f32; font-weight: 700;
  letter-spacing: 8px; text-transform: uppercase; margin-bottom: 1vh;
}
#focus-prayer-name {
  font-size: clamp(5.5rem, 11vh, 7.5rem); font-weight: 700; text-transform: uppercase;
  line-height: 1; margin-bottom: clamp(20px, 4vh, 48px);
}
#focus-prayer-name.is-jumuah { font-size: calc(clamp(5.5rem, 11vh, 7.5rem) * 0.55); line-height: 1.1; }
#focus-times-row { display: flex; align-items: center; gap: clamp(30px, 6vw, 80px); }
.focus-time-block { text-align: center; }
.focus-label {
  font-size: clamp(1.1rem, 2.2vh, 1.8rem); color: #cd7f32; font-weight: 700;
  letter-spacing: 4px; text-transform: uppercase; margin-bottom: clamp(4px, 0.8vh, 8px);
}
#focus-athan  { font-size: clamp(5rem, 16vh, 10rem); font-weight: 700; color: #fff; line-height: 1; }
#focus-iqamah { font-size: clamp(5rem, 16vh, 10rem); font-weight: 900; color: #cd7f32; line-height: 1; }
.focus-divider { width: 2px; height: clamp(60px, 14vh, 180px); background: #222; }

/* ── LEFT PANEL ── */
#left-panel {
  width: 35%;
  background: rgba(8, 8, 8, 0.94);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: clamp(24px, 4vh, 48px) clamp(20px, 3vw, 44px);
  border-right: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  height: 100vh;
  backdrop-filter: blur(10px);
}
#next-prayer-container {
  flex: 1; display: flex; flex-direction: column; justify-content: space-evenly;
}
#next-prayer-label {
  font-size: clamp(1rem, 2vh, 1.5rem); color: #cd7f32; font-weight: 800;
  letter-spacing: 5px; text-transform: uppercase;
}
#next-speaker {
  font-size: clamp(1rem, 2.2vh, 1.6rem); font-weight: 600; color: #e4b363;
  margin-bottom: clamp(8px, 1.4vh, 16px);
}
#focus-speaker {
  font-size: clamp(1.2rem, 3.2vh, 2.4rem); font-weight: 600; color: #e4b363;
  margin-bottom: clamp(6px, 1.2vh, 14px); text-align: center;
}

#next-prayer-name {
  font-size: clamp(4rem, 10vh, 10rem); font-weight: 800; text-transform: uppercase; line-height: 1; color: #fff;
}
#next-prayer-name.is-jumuah { font-size: calc(clamp(4rem, 10vh, 10rem) * 0.55); line-height: 1.1; }
.prayer-time-section {
  padding-top: clamp(14px, 2vh, 24px);
  border-top: 1px solid rgba(255,255,255,0.1);
}
.pt-label {
  font-size: clamp(1.5rem, 2vh, 1.5rem); color: #cd7f32; font-weight: 800;
  letter-spacing: 3px; text-transform: uppercase; margin-bottom: clamp(4px, 0.8vh, 8px);
}
#next-athan-time  { font-size: clamp(3.5rem, 16vh, 9rem); font-weight: 700; line-height: 1; color: #fff; }
#next-iqamah-time { font-size: clamp(3.5rem, 16vh, 9rem); font-weight: 900; color: #cd7f32; line-height: 1; }

/* ── RIGHT PANEL ── */
#right-panel {
  width: 64%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  padding: clamp(18px, 3vh, 28px) clamp(18px, 2.5vw, 34px);
  position: relative;
  overflow: hidden;
}
#clock-container {
  text-align: center;
  background: white;
  border-radius: 10px;
  padding: 16px;
}
#current-time {
  font-size: clamp(3.6rem, 11.5vh, 9rem); font-weight: 800;
  letter-spacing: -2px; line-height: 1; margin: 0; color: #000;
}
#current-date { font-size: clamp(1.9rem, 2.5vh, 2rem); color: #111; letter-spacing: 1px; margin-top: 8px; }
#current-hijri { font-size: clamp(1.5rem, 3vh, 2.4rem); font-weight: 600; color: #000000; margin-top: 4px; font-family: 'Tajawal', sans-serif; }

/* ── PRAYER GRID ── */
.prayer-grid { display: flex; justify-content: space-between; width: 100%; gap: clamp(8px, 1vw, 16px); }
.prayer-card {
  flex: 1; text-align: center; padding: clamp(16px, 2.5vh, 28px) clamp(12px, 1.5vw, 18px);
  background: linear-gradient(180deg, #111111 0%, #121212 100%);
  border-radius: clamp(14px, 2vh, 20px);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.prayer-card.next {
  background: linear-gradient(180deg, #cd7f32 0%, #b56920 100%);
  transform: scale(1.08);
  box-shadow: 0 18px 40px rgba(205,127,50,0.32);
  border-color: transparent;
}
.prayer-name {
  font-size: clamp(1.1rem, 2.5vh, 1.8rem); font-weight: 700; text-transform: uppercase;
  color: #a8a8a8; letter-spacing: 1px; margin-bottom: clamp(6px, 1.2vh, 12px);
}
.prayer-card.next .prayer-name { color: rgba(255,255,255,0.95); }
/* The khateeb under a Jumu'ah card, keyed to the same colour as the name. */
.prayer-speaker {
  font-size: clamp(0.72rem, 1.5vh, 1rem); font-weight: 600; line-height: 1.2;
  color: rgba(255,255,255,0.72); margin-bottom: 6px;
}
body.light-mode .prayer-speaker { color: #777; }
.prayer-time { font-size: clamp(1.8rem, 4.5vh, 3.5rem); font-weight: 800; color: #f5f5f5; line-height: 1; }
.prayer-card.next .prayer-time { color: #fff; }
.time-label {
  font-size: clamp(0.85rem, 1.8vh, 1.2rem); color: #888; letter-spacing: 1.5px;
  text-transform: uppercase; margin-top: clamp(8px, 1.2vh, 14px); margin-bottom: 4px;
}
.prayer-card.next .time-label { color: rgba(255,255,255,0.75); }
.iqamah-time { font-size: clamp(2rem, 4.5vh, 3.8rem); font-weight: 700; color: #cd7f32; line-height: 1; }
.prayer-card.next .iqamah-time { color: #fff; }
#status { position: absolute; bottom: 14px; right: 18px; font-size: clamp(0.85rem, 1.5vh, 1.1rem); color: rgba(255,255,255,0.72); }

/* ── RADIO BAR ── */
#radio-bar {
  position: absolute; bottom: clamp(18px, 3vh, 36px);
  left: clamp(18px, 3vw, 42px); right: clamp(18px, 3vw, 42px);
  padding-top: clamp(12px, 1.8vh, 18px); border-top: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 16px;
}
#radio-dot {
  width: clamp(10px, 1.2vh, 14px); height: clamp(10px, 1.2vh, 14px);
  border-radius: 50%; background: #cd7f32;
  flex-shrink: 0; animation: radio-pulse 1.4s ease-in-out infinite;
}
#radio-label { font-size: clamp(0.9rem, 1.8vh, 1.2rem); color: #cd7f32; letter-spacing: 3px; font-weight: 700; text-transform: uppercase; }
#radio-name  { font-size: clamp(1.2rem, 2.2vh, 1.7rem); font-weight: 600; color: #eee; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── LIGHT MODE ── */
body.light-mode #left-panel      { background: #e4e4e4; border-right: 1px solid #ccc; }
body.light-mode #current-date    { color: #111; }
body.light-mode .prayer-card     { background: #fff; border-color: #ddd; }
body.light-mode .prayer-name     { color: #888; }
body.light-mode .prayer-time     { color: #111; }
body.light-mode .time-label      { color: #aaa; }
body.light-mode .iqamah-time     { color: #b8720a; }
body.light-mode .prayer-card.next { background: #cd7f32; border-color: #cd7f32; box-shadow: 0 0 20px rgba(205,127,50,0.3); }
body.light-mode .prayer-card.next .prayer-name,
body.light-mode .prayer-card.next .prayer-time,
body.light-mode .prayer-card.next .time-label,
body.light-mode .prayer-card.next .iqamah-time { color: #fff; }
body.light-mode #next-iqamah-time  { color: #cd7f32; }
body.light-mode .prayer-time-section { border-top-color: rgba(0,0,0,0.12); }
body.light-mode #focus-view       { background: rgba(240,240,240,0.92); }
body.light-mode #focus-time,
body.light-mode #focus-hijri,
body.light-mode #focus-date,
body.light-mode #focus-prayer-name,
body.light-mode #focus-athan      { color: #000; }
body.light-mode .focus-divider    { background: #ccc; }

/* ── HAS BACKGROUND IMAGE ── */
body.has-bg #left-panel            { background: rgba(8, 8, 8, 0.92); }
body.light-mode.has-bg #left-panel { background: rgba(30, 30, 30, 0.90); }
body.bg-repeat-1 #left-panel,
body.light-mode.bg-repeat-1 #left-panel { background: #013b4beb; }
body.has-bg #radio-bar             { border-top-color: #ffffff22; }
body.has-bg #current-date          { color: #000; font-weight: 700; text-shadow: 0 1px 6px rgba(255,255,255,0.8), 0 2px 12px rgba(255,255,255,0.5); }

/* ── STATUS TEXT ── */
body.light-mode #status            { color: rgba(0,0,0,0.45); }
body.has-bg.light-mode #status     { color: rgba(0,0,0,0.45); }

/* ── Arabic ──────────────────────────────────────────────────────────────────
   Cairo covers Arabic; the layout's Latin stack does not. */
#main-container[dir='rtl'],
#focus-view[dir='rtl'] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
/* Arabic is cursive: tracked-out Latin labels would pull the joined letterforms apart. */
[dir='rtl'] #next-prayer-label,
[dir='rtl'] #next-prayer-name,
[dir='rtl'] .pt-label,
[dir='rtl'] #current-date,
[dir='rtl'] #radio-label,
[dir='rtl'] #focus-prayer-label,
[dir='rtl'] #focus-prayer-name,
[dir='rtl'] .focus-label,
[dir='rtl'] .prayer-name,
[dir='rtl'] .time-label {
  letter-spacing: 0;
}
/* Times are Latin numerals; keep them running left-to-right. */
[dir='rtl'] #next-athan-time,
[dir='rtl'] #next-iqamah-time,
[dir='rtl'] #focus-athan,
[dir='rtl'] #focus-iqamah,
[dir='rtl'] .prayer-time,
[dir='rtl'] .iqamah-time {
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
