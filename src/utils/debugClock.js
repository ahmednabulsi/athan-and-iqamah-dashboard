import { ref, watch, onMounted, onUnmounted } from 'vue'

/**
 * The debug toolbar's time travel, shared by every layout.
 *
 * App.vue owns the toolbar and drives `clockOffsetMs`; each layout keeps its own
 * one-second `now` tick, so without this they would stay on the wall clock while the
 * rest of the board moved — the countdowns would disagree with the times beside them.
 *
 * A module ref rather than a prop on fifteen components: a prop has to be bound at
 * every call site, and a missing binding fails *silently* (the layout simply never
 * moves). An import cannot be half-wired.
 *
 * Outside `?debug=1` the offset is 0 and `debugNow()` is exactly `new Date()`.
 */
export const clockOffsetMs = ref(0)

/** True only under ?debug=1 — gates the debug-only window listeners. */
export const debugEnabled = ref(false)

/** The board's current time, debug offset included. */
export function debugNow() {
  return new Date(Date.now() + clockOffsetMs.value)
}

/** The event the toolbar's "swap focus / cards" button fires. */
export const TOGGLE_VIEW_EVENT = 'tv-debug-toggle-view'

/**
 * Register a layout's view-swap handler for the toolbar, and hand back the remover.
 * A no-op when debug is off, so production registers nothing.
 */
export function onDebugToggleView(handler) {
  if (!debugEnabled.value) return () => {}
  window.addEventListener(TOGGLE_VIEW_EVENT, handler)
  return () => window.removeEventListener(TOGGLE_VIEW_EVENT, handler)
}

/**
 * One line per layout: keeps its clock in step with the toolbar's time travel, and —
 * when it has a focus/cards view to swap — wires the toolbar's swap button to it.
 *
 * @param refresh      re-read the layout's own clock (its jump is immediate, not on
 *                     the next one-second tick).
 * @param onToggleView optional; the layout's existing view-swap function.
 */
export function useDebugClock(refresh, onToggleView) {
  watch(clockOffsetMs, refresh)
  if (!onToggleView) return
  let off = () => {}
  onMounted(() => { off = onDebugToggleView(onToggleView) })
  onUnmounted(() => off())
}
