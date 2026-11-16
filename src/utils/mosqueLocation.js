/**
 * Resolve a mosque's coordinates for features that need a place rather than a time
 * (currently the Prayer Frame layout's weather block).
 *
 * The prayer-times feed carries no location at all, but the mosque directory that the
 * TV's own search screen already uses (mosques.php) has lat/lng for every entry. So the
 * id we already hold is enough — no native-side change, and no geocoding.
 *
 * The directory is ~174 KB gzipped, which is far too much to pull on every boot just to
 * draw a temperature, so the one row we care about is cached in localStorage per mosque
 * id and the network is never touched again for that mosque.
 */

const CACHE_PREFIX = 'prayer_dash_mosque_loc::'
const DIRECTORY_URL = 'https://getathan.com/api/mosques.php'

/** Pull the mosque id out of a prayer-data URL (…/prayers.php?id=XXXX). */
export function mosqueIdFromUrl(url) {
  if (!url) return ''
  try {
    return new URL(url, window.location.href).searchParams.get('id') || ''
  } catch (_) {
    return ''
  }
}

function readCache(id) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + id)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // A cached miss is remembered too, so a custom mosque that isn't in the directory
    // doesn't re-download it on every launch.
    if (parsed && parsed.found === false) return { found: false }
    if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) return parsed
  } catch (_) {}
  return null
}

function writeCache(id, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(value))
  } catch (_) {
    // Quota / private-mode failures must never break the dashboard.
  }
}

/**
 * @returns {Promise<{lat:number,lng:number,city:string,state:string}|null>}
 */
export async function resolveMosqueLocation({ mosqueId = '', mosqueUrl = '' } = {}) {
  const id = mosqueId || mosqueIdFromUrl(mosqueUrl)
  if (!id) return null

  const cached = readCache(id)
  if (cached) return cached.found === false ? null : cached

  try {
    const res = await fetch(DIRECTORY_URL, { cache: 'no-cache' })
    if (!res.ok) return null
    const list = await res.json()
    if (!Array.isArray(list)) return null

    const match = list.find(m => m.id === id || m.alias === id) ||
                  (mosqueUrl ? list.find(m => m.prayer_url === mosqueUrl) : null)
    const lat = Number(match?.lat)
    const lng = Number(match?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      writeCache(id, { found: false })
      return null
    }

    const loc = { lat, lng, city: match.city || '', state: match.state || '' }
    writeCache(id, loc)
    return loc
  } catch (_) {
    // Offline: no weather this run, and nothing cached as a miss so it retries later.
    return null
  }
}
