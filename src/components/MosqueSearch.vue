<template>
  <div class="search-screen">
    <div class="search-container">
      <h1 class="search-title">Prayer Dashboard</h1>
      <p class="search-subtitle">Find your mosque</p>

      <div class="country-toggle">
        <button
          :class="['country-btn', { active: country === 'US' }]"
          @click="country = 'US'"
        >🇺🇸 United States</button>
        <button
          :class="['country-btn', { active: country === 'CA' }]"
          @click="country = 'CA'"
        >🇨🇦 Canada</button>
      </div>

      <div class="search-input-wrap">
        <input
          ref="searchInputEl"
          v-model="query"
          type="text"
          class="search-input"
          placeholder="Type city or zip code..."
          autocomplete="off"
          spellcheck="false"
        />
        <span v-if="query" class="search-clear" @click="query = ''">✕</span>
      </div>

      <div v-if="loading" class="search-status">Loading mosque data...</div>
      <div v-else-if="error" class="search-status error">{{ error }}</div>
      <div v-else-if="query.length < 2" class="search-status">Type at least 2 characters to search</div>
      <div v-else-if="results.length === 0" class="search-status">No mosques found for "{{ query }}"</div>

      <div v-else class="results-list">
        <div
          v-for="mosque in results"
          :key="mosque.id"
          :class="['result-row', { supported: mosque.has_prayer_times, unsupported: !mosque.has_prayer_times }]"
          @click="mosque.has_prayer_times ? selectMosque(mosque) : openRequest(mosque)"
        >
          <div class="result-info">
            <div class="result-name">{{ mosque.name }}</div>
            <div class="result-location">{{ mosque.city }}, {{ mosque.state }} {{ mosque.zip }}</div>
            <div v-if="mosque.address" class="result-address">{{ mosque.address }}</div>
          </div>
          <div class="result-action">
            <span v-if="mosque.has_prayer_times" class="badge supported-badge">Prayer Times Available</span>
            <span v-else class="badge unsupported-badge">Request to Add</span>
          </div>
        </div>
        <div v-if="results.length === 50" class="search-hint">Showing first 50 results — refine your search</div>
      </div>
    </div>

    <MosqueRequestForm
      v-if="requestMosque"
      :mosque="requestMosque"
      @close="requestMosque = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import MosqueRequestForm from './MosqueRequestForm.vue'
import { trackMosqueRequestOpened, trackMosqueSearch } from '../utils/analytics.js'

const emit = defineEmits(['mosque-selected'])

const country = ref('US')
const query = ref('')
const allMosques = ref([])
const loading = ref(true)
const error = ref(null)
const requestMosque = ref(null)
const searchInputEl = ref(null)
let searchTrackTimer = null
let lastTrackedSearchKey = ''

onMounted(async () => {
  try {
    const res = await fetch('https://getathan.com/api/mosques.php')
    allMosques.value = await res.json()
  } catch (e) {
    error.value = 'Failed to load mosque data: ' + e.message
  } finally {
    loading.value = false
    searchInputEl.value?.focus()
  }
})

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []

  return allMosques.value
    .filter(m => {
      if (m.country !== country.value) return false
      return (
        m.city?.toLowerCase().includes(q) ||
        m.zip?.toLowerCase().startsWith(q) ||
        m.name?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      // Supported mosques first
      if (a.has_prayer_times !== b.has_prayer_times) return a.has_prayer_times ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, 50)
})

watch([query, country], () => {
  if (searchTrackTimer) window.clearTimeout(searchTrackTimer)

  searchTrackTimer = window.setTimeout(() => {
    const q = query.value.trim()
    if (q.length < 2) return

    const resultList = results.value
    const supportedResults = resultList.filter(m => m.has_prayer_times).length
    const searchKey = `${country.value}|${q.toLowerCase()}|${resultList.length}|${supportedResults}`
    if (searchKey === lastTrackedSearchKey) return

    lastTrackedSearchKey = searchKey
    trackMosqueSearch({
      query: q,
      country: country.value,
      resultsCount: resultList.length,
      supportedResultsCount: supportedResults,
    })
  }, 800)
})

onBeforeUnmount(() => {
  if (searchTrackTimer) window.clearTimeout(searchTrackTimer)
})

function selectMosque(mosque) {
  emit('mosque-selected', { url: mosque.prayer_url, name: mosque.name, id: mosque.id })
}

function openRequest(mosque) {
  trackMosqueRequestOpened({
    name: mosque.name,
    id: mosque.id,
    country: mosque.country,
  })
  requestMosque.value = mosque
}
</script>

<style scoped>
.search-screen {
  position: fixed;
  inset: 0;
  background: #0d1117;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', system-ui, sans-serif;
  z-index: 100;
}

.search-container {
  width: 100%;
  max-width: 760px;
  padding: 40px 32px;
}

.search-title {
  color: #e6b84a;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 4px;
  text-align: center;
}

.search-subtitle {
  color: #8b949e;
  font-size: 1rem;
  text-align: center;
  margin: 0 0 28px;
}

.country-toggle {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.country-btn {
  background: #21262d;
  border: 2px solid #30363d;
  color: #8b949e;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s;
}

.country-btn.active {
  border-color: #e6b84a;
  color: #e6b84a;
  background: #1c2028;
}

.search-input-wrap {
  position: relative;
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  background: #161b22;
  border: 2px solid #30363d;
  border-radius: 10px;
  color: #e6edf3;
  font-size: 1.1rem;
  padding: 14px 44px 14px 16px;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #e6b84a;
}

.search-clear {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #8b949e;
  cursor: pointer;
  font-size: 1rem;
}

.search-status {
  text-align: center;
  color: #8b949e;
  padding: 24px 0;
  font-size: 0.95rem;
}

.search-status.error { color: #f85149; }

.results-list {
  max-height: 55vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #30363d;
  background: #161b22;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  gap: 12px;
}

.result-row.supported:hover {
  border-color: #e6b84a;
  background: #1c2028;
}

.result-row.unsupported {
  opacity: 0.65;
}

.result-row.unsupported:hover {
  border-color: #58a6ff;
  background: #1c2028;
  opacity: 0.85;
}

.result-info { flex: 1; min-width: 0; }

.result-name {
  color: #e6edf3;
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-location {
  color: #8b949e;
  font-size: 0.85rem;
  margin-top: 2px;
}

.result-address {
  color: #6e7681;
  font-size: 0.8rem;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-action { flex-shrink: 0; }

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.supported-badge {
  background: #1a3a1a;
  color: #3fb950;
  border: 1px solid #238636;
}

.unsupported-badge {
  background: #1a2a3a;
  color: #58a6ff;
  border: 1px solid #1f6feb;
}

.search-hint {
  text-align: center;
  color: #6e7681;
  font-size: 0.8rem;
  padding: 8px 0;
}
</style>
