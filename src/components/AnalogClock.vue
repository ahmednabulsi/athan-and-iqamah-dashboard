<template>
  <svg class="clk" viewBox="0 0 200 200" :aria-label="label" role="img">
    <circle class="clk-face" cx="100" cy="100" r="100" />

    <!-- Minute ticks, with the five-minute marks drawn longer and brighter. -->
    <g class="clk-ticks">
      <rect
        v-for="t in TICKS"
        :key="t.i"
        :class="t.major ? 'clk-tick-major' : 'clk-tick'"
        :x="100 - t.w / 2"
        :y="t.y"
        :width="t.w"
        :height="t.h"
        :transform="`rotate(${t.i * 6} 100 100)`"
      />
    </g>

    <text
      v-for="n in NUMERALS"
      :key="n.n"
      class="clk-num"
      :x="n.x"
      :y="n.y"
      text-anchor="middle"
      dominant-baseline="central"
    >{{ n.n }}</text>

    <!-- Hands. Rotation via the transform attribute: Chromium 83 on the cheap frames
         does not handle transform-box/transform-origin on SVG children reliably. -->
    <rect
      class="clk-hand clk-hour"
      x="96" y="46" width="8" height="60" rx="4"
      :transform="`rotate(${hourAngle} 100 100)`"
    />
    <rect
      class="clk-hand clk-minute"
      x="96.5" y="22" width="7" height="84" rx="3.5"
      :transform="`rotate(${minuteAngle} 100 100)`"
    />
    <template v-if="showSeconds">
      <rect
        class="clk-second"
        x="99" y="18" width="2" height="100" rx="1"
        :transform="`rotate(${secondAngle} 100 100)`"
      />
      <circle class="clk-pin" cx="100" cy="100" r="4" />
    </template>
    <circle v-else class="clk-pin clk-pin-plain" cx="100" cy="100" r="3.5" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** The moment to draw. Passed in so the clock shares the board's (debuggable) clock. */
  now:         { type: Date, required: true },
  showSeconds: { type: Boolean, default: true },
  label:       { type: String, default: 'Clock' },
})

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0
  return { i, major, w: major ? 3 : 1.6, y: major ? 6 : 7, h: major ? 11 : 7 }
})

const NUMERALS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  const a = (n * 30 - 90) * (Math.PI / 180)
  const r = 66
  return { n, x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) }
})

const hourAngle = computed(() => {
  const d = props.now
  return ((d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600) * 30
})
const minuteAngle = computed(() => (props.now.getMinutes() + props.now.getSeconds() / 60) * 6)
const secondAngle = computed(() => props.now.getSeconds() * 6)
</script>

<style scoped>
.clk { display: block; width: 100%; height: 100%; }
/* Currents come from the focus screen's tokens, so the dial follows its palette. */
.clk-face        { fill: rgba(255, 255, 255, 0.05); }
.clk-tick        { fill: currentColor; opacity: 0.35; }
.clk-tick-major  { fill: currentColor; opacity: 0.9; }
.clk-num         { fill: currentColor; font-size: 17px; font-weight: 600; }
.clk-hand        { fill: currentColor; }
.clk-second      { fill: var(--l3-amber, #F5C156); }
.clk-pin         { fill: var(--l3-amber, #F5C156); }
.clk-pin-plain   { fill: currentColor; }
</style>
