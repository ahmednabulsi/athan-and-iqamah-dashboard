/**
 * Friday Jumu'ah sessions (label / time / speaker) from the scraper feed.
 *
 * The feed is keyed by the scraper's own location slug, so a display has to be
 * matched to one. Three ways in, most to least reliable:
 *   - the mosque id in prayers.php?id=… (what every current setup uses)
 *   - the legacy per-mosque JSON filename (older saved URLs)
 *   - the display name, loosely (hand-typed / custom entries)
 * No match means the mosque simply has no Jumu'ah data and the screens skip it.
 */

const FEED_URL = 'https://getathan.com/api/jummah.php'

const KEY_BY_ID = {
  E5Av2wAX: 'AlNoor',
  vOLn92KM: 'MCA',
  nDAg1BK0: 'SBIA',
  M0dYb7K6: 'WVMuslim',
  icbab:    'Bosni',
  QL01NGAZ: 'Evergreen',
  pVdwoMde: 'Fremont',
  GA66qxAe: 'MCCEastBay',
  '0Lb7eVAo': 'Furqaan',
  zKz05nAO: 'SVIC',
  xwLVbkLJ: 'YaseenBelmont',
  '0AWO20Aj': 'YaseenBurlingame',
  JAmlxjLR: 'Zakariya',
  '1QL03QKZ': 'AlMedina',
  '3AOVmaLe': 'BlossomValley',
  YADlvlAN: 'SilverCreek',
}

const KEY_BY_FILENAME = {
  'alnoor.json':                                 'AlNoor',
  'mca.json':                                    'MCA',
  'sbia.json':                                   'SBIA',
  'wvmuslim.json':                               'WVMuslim',
  'bosni.json':                                  'Bosni',
  'Evergreen Islamic center.json':               'Evergreen',
  'Islamic Center of Fremont.json':              'Fremont',
  'MCC East Bay.json':                           'MCCEastBay',
  'Masjid Furqaan Hayward.json':                 'Furqaan',
  'SVIC.json':                                   'SVIC',
  'Yaseen Belmont Masjid.json':                  'YaseenBelmont',
  'Yaseen Burlingame Center.json':               'YaseenBurlingame',
  'Zakariya.json':                               'Zakariya',
  'Al Medina Education Center.json':             'AlMedina',
  'Blossom Valley Muslim Community Center.json': 'BlossomValley',
  'Silver Creek Muslim Community Center.json':   'SilverCreek',
}

// Matched after stripping everything but letters and digits, so "Al-Noor",
// "Al Noor" and "alnoor" all land on the same key.
const KEY_BY_NAME = {
  alnoor:                                 'AlNoor',
  mca:                                    'MCA',
  muslimcommunityassociation:             'MCA',
  sbia:                                   'SBIA',
  westvalley:                             'WVMuslim',
  westvalleymuslim:                       'WVMuslim',
  wvmuslim:                               'WVMuslim',
  bosnian:                                'Bosni',
  evergreen:                              'Evergreen',
  evergreenislamiccenter:                 'Evergreen',
  icf:                                    'Fremont',
  islamiccenteroffremont:                 'Fremont',
  mcceastbay:                             'MCCEastBay',
  masjidfurqaanhayward:                   'Furqaan',
  furqaan:                                'Furqaan',
  svic:                                   'SVIC',
  yaseenbelmont:                          'YaseenBelmont',
  yaseenbelmontmasjid:                    'YaseenBelmont',
  yaseenburlingame:                       'YaseenBurlingame',
  yaseenburlingamecenter:                 'YaseenBurlingame',
  zakariya:                               'Zakariya',
  almedina:                               'AlMedina',
  almedinaeducationcenter:                'AlMedina',
  blossomvalley:                          'BlossomValley',
  blossomvalleymuslimcommunitycenter:     'BlossomValley',
  silvercreek:                            'SilverCreek',
  silvercreekmuslimcommunitycenter:       'SilverCreek',
}

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** The scraper location key for a display, or '' when the mosque has no feed. */
export function resolveJumuahKey({ mosqueId = '', mosqueUrl = '', mosqueName = '' } = {}) {
  const idFromUrl = String(mosqueUrl).match(/[?&]id=([^&]+)/)
  const id = mosqueId || (idFromUrl ? decodeURIComponent(idFromUrl[1]) : '')
  if (id && KEY_BY_ID[id]) return KEY_BY_ID[id]

  const filename = String(mosqueUrl).split('/').pop()
  if (filename) {
    const key = KEY_BY_FILENAME[decodeURIComponent(filename)]
    if (key) return key
  }

  return KEY_BY_NAME[slug(mosqueName)] || ''
}

/**
 * This week's Jumu'ah sessions for a mosque.
 * @returns [{ label, time, speaker }] — empty when unmapped or the fetch fails.
 */
export async function loadJumuahPrayers(ctx) {
  const key = resolveJumuahKey(ctx)
  if (!key) return []

  try {
    const res = await fetch(FEED_URL)
    const json = await res.json()
    const entry = (json.data || []).find(d => String(d.location).toLowerCase() === key.toLowerCase())
    return (entry?.prayers || []).filter(p => p?.time)
  } catch (e) {
    console.warn("Jumu'ah fetch failed:", e)
    return []
  }
}

/** Index of the session still ahead (the last one once they have all passed). */
export function nextJumuahIndex(sessions, now = new Date()) {
  if (!sessions?.length) return -1
  const i = sessions.findIndex(s => jumuahDate(s.time, now) >= now)
  return i === -1 ? sessions.length - 1 : i
}

/** A session's "12:15 PM" as a Date on `now`'s day. */
export function jumuahDate(time, now = new Date()) {
  const [h, m] = String(time || '').replace(/\s*(AM|PM)\s*$/i, '').trim().split(':').map(Number)
  const d = new Date(now)
  let hh = Number.isFinite(h) ? h : 0
  if (/PM/i.test(time) && hh < 12) hh += 12
  if (/AM/i.test(time) && hh === 12) hh = 0
  if (!/[AP]M/i.test(time) && hh < 11) hh += 12      // bare "1:30" on a Friday is PM
  d.setHours(hh, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}

/**
 * Replace the Dhuhr row with one row per Jumu'ah session.
 *
 * Every layout builds its own row shape, so the caller supplies `mapRow(dhuhrRow,
 * session, index, isNext)` and gets to keep whatever fields its template reads.
 * No sessions (or no Dhuhr row) leaves the list untouched, which is what keeps
 * this inert for mosques the feed does not cover and on the other six days.
 */
export function withJumuahRows(rows, sessions, mapRow, now = new Date()) {
  if (!sessions?.length) return rows
  const at = rows.findIndex(r => r.key === 'dhuhr')
  if (at < 0) return rows
  const nextIdx = nextJumuahIndex(sessions, now)
  // Every generated row is tagged, so a layout can tell a Jumu'ah session from a
  // prayer without re-deriving it: the focus views drop the adhan/iqamah pair for
  // these and show when the khutbah starts instead.
  const made = sessions.map((s, i) => ({
    ...mapRow(rows[at], s, i, i === nextIdx),
    isJumuah: true,
    isNextJumuah: i === nextIdx,
  }))
  return [...rows.slice(0, at), ...made, ...rows.slice(at + 1)]
}

/**
 * What to call a session. The feed's labels are English and sometimes carry a venue
 * ("Jummah 2 - Rosewood Center"); an Arabic board gets the Arabic word instead,
 * numbered when the mosque holds more than one.
 */
export function jumuahName(session, { lang = 'en', index = 0, count = 1, label = "Jumu'ah" } = {}) {
  if (lang === 'ar') return count > 1 ? `${label} ${index + 1}` : label
  return session?.label || label
}

/**
 * When the next khutbah starts, or null when none is ahead.
 *
 * Countdowns otherwise target `dhuhr_iqamah`, which on a Friday with several
 * sessions has usually already passed — they then roll over to tomorrow and show
 * "22h" while the hall is filling for the session twenty minutes away.
 */
export function nextJumuahAt(sessions, now = new Date()) {
  if (!sessions?.length) return null
  const i = nextJumuahIndex(sessions, now)
  if (i < 0) return null
  const at = jumuahDate(sessions[i].time, now)
  return at > now ? at : null
}
