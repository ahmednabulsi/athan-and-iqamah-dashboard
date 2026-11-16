<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="form-card">
      <button class="close-btn" @click="$emit('close')">✕</button>

      <h2 class="form-title">Request to Add Mosque</h2>
      <p class="form-subtitle">We'll add prayer times once we can source the data.</p>

      <div v-if="submitted" class="success-msg">
        <div class="success-icon">✓</div>
        <p>Thank you! We'll look into adding prayer times for <strong>{{ form.name }}</strong>.</p>
        <button class="btn-primary" @click="$emit('close')">Close</button>
      </div>

      <form v-else @submit.prevent="submit">
        <div class="field">
          <label>Mosque Name</label>
          <input v-model="form.name" type="text" required />
        </div>
        <div class="field-row">
          <div class="field">
            <label>City</label>
            <input v-model="form.city" type="text" required />
          </div>
          <div class="field">
            <label>State / Province</label>
            <input v-model="form.state" type="text" required />
          </div>
        </div>
        <div class="field">
          <label>Mosque Website <span class="optional">(optional)</span></label>
          <input v-model="form.website" type="url" placeholder="https://..." />
        </div>
        <div class="field">
          <label>Prayer Schedule URL <span class="optional">(optional)</span></label>
          <input v-model="form.schedule_url" type="url" placeholder="Link to prayer times page..." />
        </div>
        <div class="field">
          <label>Your Email <span class="optional">(optional)</span></label>
          <input v-model="form.email" type="email" placeholder="so we can follow up" />
        </div>
        <div class="field">
          <label>Notes <span class="optional">(optional)</span></label>
          <textarea v-model="form.notes" rows="2" placeholder="Anything else we should know..." />
        </div>

        <div v-if="submitError" class="error-msg">{{ submitError }}</div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Sending...' : 'Submit Request' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  mosque: { type: Object, required: true }
})
defineEmits(['close'])

const submitted = ref(false)
const submitting = ref(false)
const submitError = ref(null)

const form = reactive({
  name: props.mosque.name || '',
  city: props.mosque.city || '',
  state: props.mosque.state || '',
  country: props.mosque.country || '',
  mosque_id: props.mosque.id || '',
  website: props.mosque.website || '',
  schedule_url: '',
  email: '',
  notes: '',
})

async function submit() {
  submitting.value = true
  submitError.value = null
  try {
    // Stub: log for now, backend to be wired up later
    console.log('Mosque request submitted:', { ...form })
    // TODO: replace with real endpoint
    // await fetch('/api/mosque-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    await new Promise(r => setTimeout(r, 600)) // simulate network
    submitted.value = true
  } catch (e) {
    submitError.value = 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.form-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 14px;
  padding: 32px;
  width: 100%;
  max-width: 520px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
}

.form-title {
  color: #e6b84a;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 6px;
}

.form-subtitle {
  color: #8b949e;
  font-size: 0.9rem;
  margin: 0 0 24px;
}

.field {
  margin-bottom: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

label {
  display: block;
  color: #8b949e;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.optional { color: #6e7681; }

input, textarea {
  width: 100%;
  box-sizing: border-box;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 0.95rem;
  padding: 10px 12px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

input:focus, textarea:focus {
  border-color: #e6b84a;
}

textarea { resize: vertical; }

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary {
  background: #e6b84a;
  color: #0d1117;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  background: #21262d;
  color: #8b949e;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 0.95rem;
  cursor: pointer;
}

.success-msg {
  text-align: center;
  padding: 24px 0;
  color: #e6edf3;
}

.success-icon {
  font-size: 2.5rem;
  color: #3fb950;
  margin-bottom: 12px;
}

.error-msg {
  color: #f85149;
  font-size: 0.85rem;
  margin-top: 8px;
  text-align: center;
}
</style>
