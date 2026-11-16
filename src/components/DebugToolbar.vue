<template>
  <div class="dbg" :class="{ collapsed }">
    <div class="dbg-head">
      <button type="button" class="dbg-toggle" @click="collapsed = !collapsed">
        {{ collapsed ? '▲' : '▼' }} DEBUG
      </button>
      <span class="dbg-now">{{ simulatedLabel }}</span>
      <span class="dbg-offset" v-if="offsetMs !== 0">{{ offsetLabel }}</span>
    </div>

    <div class="dbg-body" v-if="!collapsed">
      <div class="dbg-row">
        <span class="dbg-label">Time</span>
        <button type="button" v-for="s in STEPS" :key="s.ms" @click="emit('nudge', s.ms)">{{ s.label }}</button>
        <button type="button" class="dbg-reset" @click="emit('set-offset', 0)">real time</button>
      </div>

      <div class="dbg-row" v-for="j in jumps" :key="j.key">
        <span class="dbg-label">{{ j.name }}</span>
        <button type="button" @click="emit('jump', j.adhanAt - 5000)">→ adhan −5s</button>
        <button type="button" @click="emit('jump', j.adhanAt + 2000)">after adhan</button>
        <button type="button" @click="emit('jump', j.iqamahAt - 5000)">→ iqamah −5s</button>
        <button type="button" @click="emit('jump', j.iqamahAt + 2000)">after iqamah</button>
      </div>

      <div class="dbg-row" v-if="nightFocusAt">
        <span class="dbg-label">Jump</span>
        <button type="button" @click="emit('jump', nightFocusAt)">night focus starts</button>
        <button type="button" @click="emit('jump', nightFocusAt + 2 * 3600 * 1000)">deep night (+2h)</button>
      </div>

      <div class="dbg-row">
        <span class="dbg-label">Countdown</span>
        <button
          type="button"
          v-for="c in COUNTDOWN_FOR"
          :key="c.value"
          :class="{ on: countdownFor === c.value }"
          @click="emit('set-countdown-for', c.value)"
        >{{ c.label }}</button>
      </div>

      <div class="dbg-row">
        <span class="dbg-label">Lead</span>
        <button
          type="button"
          v-for="l in COUNTDOWN_LEAD"
          :key="l.value"
          :class="{ on: String(countdownLead) === l.value }"
          @click="emit('set-countdown-lead', l.value)"
        >{{ l.label }}</button>
      </div>

      <div class="dbg-row">
        <span class="dbg-label">Night</span>
        <button
          type="button"
          v-for="m in DARK_MODES"
          :key="m"
          :class="{ on: darkModePref === m }"
          @click="emit('set-dark-mode', m)"
        >{{ m }}</button>
        <span class="dbg-state">night now: {{ darkNow ? 'ON' : 'off' }}</span>
      </div>

      <div class="dbg-row">
        <span class="dbg-label">Screen</span>
        <button type="button" @click="emit('toggle-view')">swap focus / cards</button>
        <button type="button" :class="{ on: athanPlaying }" @click="emit('toggle-athan')">
          athan takeover {{ athanPlaying ? 'off' : 'on' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  offsetMs:     { type: Number, default: 0 },
  nowMs:        { type: Number, default: 0 },
  /** [{ key, name, adhanAt, iqamahAt }] in epoch ms, from the live feed. */
  jumps:        { type: Array, default: () => [] },
  nightFocusAt: { type: Number, default: 0 },
  athanPlaying: { type: Boolean, default: false },
  /** 'athan' | 'iqamah' | 'both' — the live Countdown For setting. */
  countdownFor: { type: String, default: 'athan' },
  /** Minutes of lead before the countdown screen appears ('off' disables it). */
  countdownLead: { type: [String, Number], default: '1' },
  /** 'auto' | 'on' | 'off', and whether night is actually on right now. */
  darkModePref: { type: String, default: 'auto' },
  darkNow:      { type: Boolean, default: false },
})
const emit = defineEmits([
  'nudge', 'jump', 'set-offset', 'toggle-view', 'toggle-athan',
  'set-countdown-for', 'set-countdown-lead', 'set-dark-mode',
])

const COUNTDOWN_FOR = [
  { value: 'athan',  label: 'athan only' },
  { value: 'iqamah', label: 'iqamah only' },
  { value: 'both',   label: 'both' },
]
// Mirrors the real Countdown Lead setting's values.
const COUNTDOWN_LEAD = [
  { value: 'off', label: 'off' },
  { value: '1',   label: '1m' },
  { value: '2',   label: '2m' },
  { value: '3',   label: '3m' },
  { value: '5',   label: '5m' },
  { value: '10',  label: '10m' },
  { value: '15',  label: '15m' },
]
const DARK_MODES = ['auto', 'on', 'off']

const collapsed = ref(false)

const STEPS = [
  { label: '−1h',  ms: -3600000 },
  { label: '−10m', ms: -600000 },
  { label: '−1m',  ms: -60000 },
  { label: '−10s', ms: -10000 },
  { label: '+10s', ms: 10000 },
  { label: '+1m',  ms: 60000 },
  { label: '+10m', ms: 600000 },
  { label: '+1h',  ms: 3600000 },
]

const simulatedLabel = computed(() =>
  new Date(props.nowMs).toLocaleString('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit',
  })
)
const offsetLabel = computed(() => {
  const t = Math.abs(Math.round(props.offsetMs / 1000))
  const sign = props.offsetMs < 0 ? '−' : '+'
  const h = Math.floor(t / 3600)
  const m = Math.floor((t / 60) % 60)
  const s = t % 60
  return `${sign}${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s}s`
})
</script>

<style scoped>
.dbg {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 9999;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: #E6EAF2;
  background: rgba(10, 13, 18, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 8px 10px;
  max-width: min(92vw, 760px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
}
.dbg-head { display: flex; align-items: center; gap: 10px; }
.dbg-now { opacity: 0.85; }
.dbg-offset { color: #F5C156; }
.dbg-state { opacity: 0.7; }
.dbg-body { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.dbg-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dbg-label { width: 78px; flex: none; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.08em; }
button {
  font: inherit;
  color: inherit;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
}
button:hover { background: rgba(255, 255, 255, 0.16); }
button.on, .dbg-reset { border-color: rgba(245, 193, 86, 0.5); color: #F5C156; }
.dbg-toggle { border-color: rgba(255, 255, 255, 0.3); }
</style>
