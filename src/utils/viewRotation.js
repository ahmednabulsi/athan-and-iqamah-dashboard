/**
 * One clock for the whole board.
 *
 * Every layout used to run its own setInterval for the main <-> focus alternation
 * while App.vue ran a second one for the events/Jumu'ah slides. Two timers, started
 * at different moments and re-armed by different things (a swipe restarts only the
 * layout's), drift apart: the slide would land two seconds into the board's own
 * dwell, so a screen that is meant to hold for `focus_interval` seconds flashed by.
 *
 * So the dwell lives here, in one timer, and every screen is a slot of it:
 *
 *     main -> focus -> slide -> main -> focus -> slide ...
 *
 * Layouts read `boardPhase` (even = their main view, odd = their focus view) instead
 * of ticking themselves, and App.vue reads `slideDue`. Nothing can land mid-dwell
 * because there is only one dwell.
 */
import { ref, computed } from 'vue'

/** Two board slots, then one slide slot — the board keeps two turns in three. */
const SLOTS_PER_SLIDE = 3

const intervalSec = ref(30)
const held        = ref(false)
const phase       = ref(0)
const slideSlot   = ref(false)
const turn        = ref(0)
const slots       = ref(0)

let boardSlotsSinceSlide = 0
/** Parity nudge from a manual swipe. Deliberately not reactive: a swipe has already
 *  put the view it wants on screen, and re-running the layout's tick handler here
 *  would only fight it. The next real tick picks the offset up and carries on from
 *  the swiped-to view. */
let phaseOffset = 0
let timer = null
/** Asked of App.vue: is there actually a slide to show? Without this the board
 *  would hold one view for two slots on a mosque with no events. */
let slideReady = () => false

/** Even = the layout's main view, odd = its focus view. */
export const boardPhase = computed(() => phase.value + phaseOffset)
/** True for the whole of the slide's own slot. */
export const slideDue   = computed(() => slideSlot.value)
/** How many slide slots have come round — the week and Jumu'ah cards take turns. */
export const slideTurn  = computed(() => turn.value)
/** Bumped at the end of every slot, slide slots included. Anything that wants to come
 *  up without cutting a screen short waits for this. */
export const slotTick   = computed(() => slots.value)

function arm() {
  if (timer) { clearInterval(timer); timer = null }
  const sec = Number(intervalSec.value)
  if (!held.value && sec > 0) timer = setInterval(onSlotEnd, sec * 1000)
}

function onSlotEnd() {
  slots.value++
  if (slideSlot.value) {
    // The slide had its full turn. The board resumes on the view it had when the
    // slide took over — advancing the phase here would show that view twice.
    slideSlot.value = false
    turn.value++
    boardSlotsSinceSlide = 0
    return
  }
  phase.value++
  boardSlotsSinceSlide++
  if (boardSlotsSinceSlide >= SLOTS_PER_SLIDE - 1 && slideReady()) slideSlot.value = true
}

/** `focus_interval` seconds, or 0 to stop alternating altogether. */
export function setRotationInterval(sec) {
  const n = Number(sec)
  if (!Number.isFinite(n) || n === intervalSec.value) return
  intervalSec.value = n
  resetRotation()
}

/** Back to the board's main view, with a fresh dwell. */
export function resetRotation() {
  phaseOffset = 0
  phase.value = 0
  slideSlot.value = false
  boardSlotsSinceSlide = 0
  arm()
}

/** Give whatever is showing a full dwell from now — a swipe to another view.
 *  @param focusShowing when given, lines the clock's parity up with the view the
 *  swipe put up, so the next tick moves on instead of repeating it. */
export function restartRotationDwell(focusShowing) {
  if (focusShowing != null) {
    const want = focusShowing ? 1 : 0
    if (Math.abs((phase.value + phaseOffset) % 2) !== want) phaseOffset++
  }
  arm()
}

/** Freeze the rotation while something off-rotation owns the screen (an athan or
 *  countdown takeover, a manual events peek). Whatever is underneath keeps its
 *  place and gets a whole dwell again when the takeover steps aside. */
export function holdRotation(on) {
  if (held.value === !!on) return
  held.value = !!on
  arm()
}

/** A swipe off the slide: hand the slot back to the board rather than straight on
 *  to the next slide, and let the board's view have its full dwell. */
export function skipSlideSlot() {
  if (slideSlot.value) turn.value++
  slideSlot.value = false
  boardSlotsSinceSlide = 0
  arm()
}

export function setSlideReady(fn) { slideReady = fn }

arm()
