<template>
  <div class="prayer-grid">
    <div
      v-for="p in prayers"
      :key="p.rowKey || p.key"
      class="prayer-card"
      :class="{ next: p.isCurrent }"
    >
      <div class="prayer-name">{{ p.name }}</div>
      <div v-if="p.speaker" class="prayer-speaker">{{ p.speaker }}</div>
      <div class="prayer-time">{{ p.adhan }}</div>
      <div class="time-label">{{ iqamahLabel }}</div>
      <div class="iqamah-time">{{ p.iqamah }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  prayers: { type: Array, required: true },
  // The host layout owns the language, so it passes the already-translated label.
  iqamahLabel: { type: String, default: 'Iqamah' },
})
</script>
