<!--
  Optional background photo for the layouts that paint a flat color behind their
  cards (layouts 1, 2, 3, 4, 7). Sits at z-index -1 inside the layout root, which
  every one of them isolates: that puts the photo above the root's own background
  color and below the backdrop tint and all of the content, so a mosque can swap
  the solid background for an image without any other styling changing.

  A scrim goes over the photo — dark under light type, light under dark type — so
  the board stays readable on any photograph. The Backdrop control tunes it further.
-->
<template>
  <template v-if="photo">
    <div class="photo-backdrop night-dim" :style="photoStyle"></div>
    <div class="photo-backdrop photo-scrim" :style="{ background: scrim }"></div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { relativeLuminance } from '../utils/colorAdjust.js'

const props = defineProps({
  // '' = no photo; the layout keeps its background color.
  image:  { type: String, default: '' },
  // 'true' tiles the image at its natural size (the patterned backgrounds);
  // anything else covers the screen (the photographs).
  repeat: { type: [Boolean, String], default: false },
  // The layout's body text color, which decides the scrim's polarity.
  textColor: { type: String, default: '#FFFFFF' },
  // Optional softening, for layouts whose text covers the whole board rather than
  // sitting inside cards. A scrim only changes the photo's brightness; it cannot stop
  // a minaret edge running through a prayer time. Any CSS length - use a viewport unit
  // so the softening scales with the screen. '' leaves the photo sharp.
  blur: { type: String, default: '' },
})

const photo = computed(() => String(props.image || '').trim())

const photoStyle = computed(() => {
  const tiled = props.repeat === true || props.repeat === 'true'
  const blur = String(props.blur || '').trim()
  return {
    backgroundImage:    `url("${photo.value}")`,
    backgroundSize:     tiled ? 'auto'   : 'cover',
    backgroundRepeat:   tiled ? 'repeat' : 'no-repeat',
    backgroundPosition: tiled ? ''       : 'center',
    // Scaled up because a blurred layer feathers its own edges, which would otherwise
    // show as a pale frame around the board.
    filter:             blur ? `blur(${blur})` : '',
    transform:          blur ? 'scale(1.08)'   : '',
  }
})

const scrim = computed(() => {
  const hex = String(props.textColor || '').trim()
  const light = /^#[0-9a-f]{3,8}$/i.test(hex) ? relativeLuminance(hex) > 0.5 : true
  return light ? 'rgba(0, 0, 0, 0.62)' : 'rgba(255, 255, 255, 0.62)'
})
</script>

<style scoped>
.photo-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
