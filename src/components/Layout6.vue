<template>
  <div class="l6-root">

    <!-- MCA logo (only for Masjid Al-Noor (MCA)) -->
    <img v-if="isMCA" class="l6-logo" :src="mcaLogoPng" alt="MCA logo" />

    <!-- Topbar: Hijri + day/date on top, time below -->
    <div class="l6-topbar">
      <div class="l6-tb-top">
        <div class="l6-tb-hijri">{{ hijriDate }}</div>
        <div class="l6-tb-date">
          <span class="l6-tb-day">{{ dayShort }}</span>
          <span class="l6-tb-dateval">{{ dateShort }}</span>
        </div>
      </div>
      <div class="l6-tb-time">
        <span class="l6-tb-time-num">{{ clockParts.num }}</span><span class="l6-tb-time-period">{{ clockParts.period }}</span>
      </div>
    </div>

    <!-- Column labels -->
    <div class="l6-col-header">
      <span class="l6-ch-prayer">Prayer</span>
      <span class="l6-ch-time">Adhan</span>
      <span class="l6-ch-time">Iqamah</span>
    </div>

    <!-- Prayer rows -->
    <div class="l6-rows">

      <div
        v-for="p in prayers"
        :key="p.key"
        class="l6-row"
        :class="{ active: nextPrayerKey === p.key }"
      >
        <div class="l6-row-inner">
          <span class="l6-pname">{{ p.name }}</span>
          <span class="l6-ptime">{{ p.adhan }}</span>
          <span class="l6-ptime l6-gold">{{ p.iqamah }}</span>
        </div>
        <div v-if="p.key === 'fajr' && sunriseTime" class="l6-sunrise-line">
          <span class="l6-pname"></span>
          <span class="l6-sunrise-content">
            <span class="l6-sunrise-label">Sunrise</span>
            <span class="l6-sunrise-time">{{ sunriseTime }}</span>
          </span>
        </div>
        <div v-if="p.tomorrowIqamah" class="l6-iqamah-change-line">
          <span class="l6-pname"></span>
          <span class="l6-iqamah-change-content">
            <span class="l6-iqamah-change-label">🔔 Tomorrow</span>
            <span class="l6-iqamah-change-time">{{ p.tomorrowIqamah }}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="l6-mosque" v-if="props.mosqueName">📍 {{ props.mosqueName }}</div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { debugNow, useDebugClock } from '../utils/debugClock.js'
import { getPrayerDateTime, getNextPrayerDateTime } from '../utils/prayerTime.js'
import mcaLogoPng from '../assets/mca-logo.png'

const props = defineProps({
  prayerData:         Object,
  tomorrowPrayerData: Object,
  nextPrayerKey:      String,
  mosqueName:         String,
  mosqueId:           String,
})

const MCA_IDS   = ['E5Av2wAX', 'vOLn92KM']
const MCA_NAMES = ['MCA', 'Masjid Al-Noor (MCA)', 'Muslim Community Association']

const now = ref(debugNow())
let clockInterval = null

const isMCA = computed(() =>
  MCA_IDS.includes(props.mosqueId) || MCA_NAMES.includes(props.mosqueName)
)

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    azaanKey: 'fajr_azaan',    iqamahKey: 'fajr_iqamah',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   name: 'Dhuhr',   azaanKey: 'dhuhr_azaan',   iqamahKey: 'dhuhr_iqamah',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     name: 'Asr',     azaanKey: 'asr_azaan',     iqamahKey: 'asr_iqamah',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', name: 'Maghrib', azaanKey: 'maghrib_azaan', iqamahKey: 'maghrib_iqamah', isFajr: false, isDhuhr: false },
  { key: 'isha',    name: 'Isha',    azaanKey: 'isha_azaan',    iqamahKey: 'isha_iqamah',    isFajr: false, isDhuhr: false },
]

const fmt12 = d => {
  let h = d.getHours(), m = d.getMinutes()
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')}`
}

const IQAMAH_ALERT_KEYS = ['fajr', 'dhuhr', 'asr', 'isha']

const prayers = computed(() => {
  if (!props.prayerData) return PRAYERS.map(p => ({ ...p, adhan: '--:--', iqamah: '--:--', tomorrowIqamah: null }))
  return PRAYERS.map(p => {
    const todayIq    = props.prayerData[p.iqamahKey]
    const tomorrowIq = props.tomorrowPrayerData?.[p.iqamahKey]
    const showChange = IQAMAH_ALERT_KEYS.includes(p.key) && tomorrowIq && tomorrowIq !== todayIq
    return {
      ...p,
      adhan:  fmt12(getPrayerDateTime(props.prayerData[p.azaanKey], p.isFajr, p.isDhuhr)),
      iqamah: fmt12(getPrayerDateTime(todayIq,                      p.isFajr, p.isDhuhr)),
      tomorrowIqamah: showChange
        ? fmt12(getPrayerDateTime(tomorrowIq, p.isFajr, p.isDhuhr))
        : null,
    }
  })
})

const clockParts = computed(() => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
  let num = '', period = ''
  for (const p of fmt.formatToParts(now.value)) {
    if (p.type === 'dayPeriod') period = p.value
    else num += p.value
  }
  return { num: num.trim(), period }
})

const dayShort  = computed(() => now.value.toLocaleDateString('en-US', { weekday: 'short' }))
const dateShort = computed(() => now.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qi'dah", "Dhul Hijjah",
]
const hijriDate = computed(() => {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(now.value)
    const get = t => parts.find(p => p.type === t)?.value
    const m = parseInt(get('month')) - 1
    if (m >= 0 && m < 12) return `${get('day')} ${HIJRI_MONTHS[m]} ${get('year')} AH`
  } catch (_) {}
  return ''
})

const sunriseTime = computed(() => {
  if (!props.prayerData?.sunrise) return null
  const d = getPrayerDateTime(props.prayerData.sunrise, true, false)
  return fmt12(d)
})

const countdown = computed(() => {
  if (!props.prayerData || !props.nextPrayerKey) return '--:--:--'
  const p = PRAYERS.find(x => x.key === props.nextPrayerKey)
  if (!p) return '--:--:--'
  const target = getNextPrayerDateTime(props.prayerData[p.iqamahKey], p.isFajr, p.isDhuhr, now.value)
  const diff = target - now.value
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff / (1000 * 60)) % 60)
  const s = Math.floor((diff / 1000) % 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})

onMounted(() => { clockInterval = setInterval(() => { now.value = debugNow() }, 1000) })
onUnmounted(() => { clearInterval(clockInterval) })

// Debug toolbar: follow its time travel, and its view swap where there is one.
useDebugClock(() => { now.value = debugNow() })
</script>

<style scoped>
* { box-sizing: border-box; }

.l6-root > * {
  position: relative;
  z-index: 1;
}

.l6-root {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100vh;
  height: 100vw;
  transform: translate(-50%, -50%) rotate(270deg);
  transform-origin: center center;
  background-image: url('https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/bg-222.jpg');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: #ffffff;
  padding: 205px 30px;
  padding-bottom: 74px;

/* This panel is always rotated (90deg / 270deg) and sized 100vh x 100vw, so its
   container-query inline size IS the viewport's height and its block size IS the
   viewport's width. `cqi`/`cqb` would be exact here - but they are Chrome 105+, and
   the MWE-004 frames run Chromium 83, where the whole declaration is invalid: the
   base font-size below fell back to an inherited 16px and the mosque line lost its
   `bottom`/`right`, landing on the Hijri date. vh/vw are the identical values with
   none of that risk. See LOCKED_FRAME_KIOSK_SETUP.md section 12. */
  container-type: size;
  container-name: l6;

  font-size: clamp(11px, 1.95vh, 36px);
}

/* ── MCA logo header ─────────────────────────── */
.l6-logo {
  position: absolute;
  top: clamp(100px, 12vw, 100px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  width: clamp(120px, 20vw, 180px);   /* Chromium 83 has no container units */
  width: clamp(120px, 20vh, 180px);
  height: auto;
  display: block;
}

/* ── Topbar ──────────────────────────────────── */
.l6-topbar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: clamp(4px, 0.6vw, 12px);
  padding: clamp(6px, 1vw, 14px) 0px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  backdrop-filter: blur(4px);
}

.l6-tb-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: clamp(8px, 1.2vh, 24px);
}

.l6-tb-hijri {
  font-size: 1em;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.5px;
}

.l6-tb-time {
  display: block;
  width: 100%;
  align-self: stretch;
  font-size: 2em;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
  text-align: center;
}
.l6-tb-time-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.l6-tb-time-period {
  margin-left: 0.4em;
  font-feature-settings: normal;
}

.l6-tb-date {
  display: flex;
  align-items: baseline;
  gap: clamp(6px, 0.8vw, 12px);
}

.l6-tb-day {
  font-size: 1.1em;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.l6-tb-dateval {
  font-size: 1.1em;
  font-weight: 400;
  color: #ffffff;
}

/* ── Mosque name (bottom-right corner) ───────── */
.l6-mosque {
  position: absolute;
  bottom: clamp(10px, 1.4vw, 18px);
  right: clamp(20px, 2.5vh, 40px);
  font-size: clamp(11px, 1.5vh, 16px);
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
  pointer-events: none;
  z-index: 5;
}

/* ── Column header ───────────────────────────── */
.l6-col-header {
  display: flex;
  align-items: center;
  padding: clamp(5px, 0.7vh, 9px) clamp(28px, 3.5vw, 56px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.l6-ch-prayer {
  flex: 2;
  font-size: 1em;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #ffffff;
  font-weight: 700;
}

.l6-ch-time {
  flex: 1.5;
  font-size: 1em;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #ffffff;
  font-weight: 700;
  text-align: center;
}

/* ── Rows ────────────────────────────────────── */
.l6-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.l6-row {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 clamp(28px, 3.5vw, 56px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  transition: background 0.3s;
}

.l6-row.active {
  background: rgba(255, 255, 255, 0.15);
  border-left: 5px solid #ffffff;
}

.l6-row-inner {
  display: flex;
  align-items: center;
}

.l6-pname {
  flex: 1.4;
  font-size: 2.05em;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.l6-row.active .l6-pname {
  color: #ffffff;
}

.l6-ptime {
  flex: 1.5;
  font-size: 1.8em;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
  line-height: 1;
}

.l6-gold {
  font-size: 1.9em !important;
  color: #ffffff !important;
}

/* ── Sunrise sub-line (inside Fajr row) ──────── */
.l6-sunrise-line {
  display: flex;
  align-items: center;
  padding-bottom: clamp(6px, 0.9vw, 12px);
}

.l6-sunrise-content {
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.5vw, 20px);
}

.l6-sunrise-label {
  font-size: 1.3em;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.l6-sunrise-time {
  font-size: 1.5em;
  color: #E8A020;
  font-weight: 700;
}

/* ── Tomorrow iqamah change (per-prayer, inline) ─ */
.l6-iqamah-change-line {
  display: flex;
  align-items: center;
  padding-bottom: clamp(6px, 0.9vw, 12px);
}

.l6-iqamah-change-content {
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.5vw, 20px);
}

.l6-iqamah-change-label {
  font-size: 1.2em;
  color: rgba(255, 224, 138, 0.9);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.l6-iqamah-change-time {
  font-size: 1.4em;
  color: #FFE08A;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
