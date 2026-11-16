/**
 * Masjid events for the dashboard.
 *
 * getathan.com/api/events.php?id=<mosqueId> already serves one normalized schema for
 * every mosque (the same feed the phone app reads), so this only has to fetch, cache
 * and window it. Nothing here knows about a particular masjid.
 *
 * The board runs on wall displays that are routinely offline, so every successful
 * response is cached and the cache is served first — a dead network shows yesterday's
 * list rather than an empty screen.
 */

const ENDPOINT = 'https://getathan.com/api/events.php'
const CACHE_PREFIX = 'prayer_dash_events_'
/** Events change on a human timescale; once every six hours is plenty. */
export const EVENTS_TTL_MS = 6 * 60 * 60 * 1000

/** The feed is keyed by mosque id. Fall back to the id embedded in the feed URL,
 *  which is where it lives when the board was opened from a plain ?mosque= link. */
export function resolveMosqueId(mosqueId, mosqueUrl) {
  if (mosqueId) return mosqueId
  const m = String(mosqueUrl || '').match(/[?&]id=([^&]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

function readCache(id) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch (_) { return null }
}

function writeCache(id, payload) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ at: Date.now(), payload }))
  } catch (_) { /* quota or private mode: run uncached */ }
}

/** Titles are compared across two sections of the same feed, which disagree on
 *  spacing and quote characters. */
const titleKey = t => String(t || '')
  .toLowerCase()
  .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()

/** Raw feed entry -> the shape the screens use. Returns null for unusable rows. */
function normalize(raw) {
  if (!raw?.title || !raw?.start) return null
  const start = new Date(raw.start)
  if (Number.isNaN(start.getTime())) return null
  const end = raw.end ? new Date(raw.end) : null
  return {
    title: String(raw.title).trim(),
    start,
    end: end && !Number.isNaN(end.getTime()) ? end : null,
    venue: String(raw.venue || '').trim(),
    image: raw.image || null,
    allDay: !!raw.all_day,
    featured: !!raw.featured,
  }
}

/**
 * Events for a mosque, cache-first.
 * @returns { events, fromCache } — events sorted by start, unusable rows dropped.
 */
export async function loadEvents(id, { force = false } = {}) {
  if (!id) return { events: [], fromCache: false }

  const cached = readCache(id)
  const fresh = cached && Date.now() - cached.at < EVENTS_TTL_MS
  if (cached && fresh && !force) {
    return { events: parseFeed(cached.payload), fromCache: true }
  }

  try {
    const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`events ${res.status}`)
    const payload = await res.json()
    writeCache(id, payload)
    return { events: parseFeed(payload), fromCache: false }
  } catch (_) {
    // Offline or the endpoint is down: whatever we have beats an empty screen.
    return { events: cached ? parseFeed(cached.payload) : [], fromCache: true }
  }
}

function parseFeed(payload) {
  // The masjid's own "featured" section is a separate list whose entries carry a
  // human date string ("Nov 08, 2026") and no parseable start, so it cannot be shown
  // on its own. Match it back to the dated events by title and flag those instead.
  // Some feeds also set `featured` on the event rows directly; either counts.
  const featured = new Set(
    (payload?.featured || []).map(f => titleKey(f?.title)).filter(Boolean)
  )
  return (payload?.events || [])
    .map(normalize)
    .filter(Boolean)
    .map(e => (featured.has(titleKey(e.title)) ? { ...e, featured: true } : e))
    .sort((a, b) => a.start - b.start)
}

/** Only this venue's events, when a screen is set to show its own masjid.
 *  Rows with no venue are kept — most of the feed omits it, and dropping them
 *  would leave an Al-Noor screen with almost nothing. */
export function filterByVenue(events, venue) {
  if (!venue) return events
  const want = venue.toLowerCase()
  return events.filter(e => !e.venue || e.venue.toLowerCase().includes(want))
}

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Still to come today. */
export function remainingToday(events, now) {
  return events.filter(e => e.start > now && sameDay(e.start, now))
}

/** The next `days` days, today included, starting from now. */
export function upcoming(events, now, days = 7) {
  const until = new Date(now)
  until.setDate(until.getDate() + days)
  until.setHours(23, 59, 59, 999)
  return events.filter(e => e.start > now && e.start <= until)
}

/** "11:00 AM", or the all-day label when the time carries no meaning. */
export function eventTime(event, { hour12 = true, locale = 'en-US', allDayLabel = 'All day' } = {}) {
  if (event.allDay) return allDayLabel
  return event.start.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12 })
}
