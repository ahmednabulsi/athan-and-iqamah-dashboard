/**
 * Weather for the boards that show it, from Open-Meteo (no API key).
 *
 * The Prayer Frame has drawn a single "now + today's high/low" block since it was
 * built; Modern Tiles asks for three readings — now, tonight and tomorrow — so the
 * fetch and the code→icon table live here rather than in either layout.
 *
 * Nothing is drawn until the mosque's lat/lng are known (see utils/mosqueLocation.js),
 * and a failed fetch keeps whatever was last read: a board on a flaky connection
 * shows slightly stale weather rather than an empty hole.
 */
import { ref, computed, onMounted, onUnmounted, watch, toValue } from 'vue'

/** Material's weather glyphs, 24×24. */
export const WEATHER_ICON = {
  sunny:  'm6.76 4.84-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7 1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-1 4.95h2V19.5h-2v2.95zm-7.45-3.91 1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
  cloudy: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0 1 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0 1 22 15c0 1.65-1.35 3-3 3z',
  rainy:  'M17.66 8 12 2.35 6.34 8C4.78 9.56 4 11.64 4 13.64s.78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.64 2.34-5.64s-.78-4.11-2.34-5.67zM6 14c.01-2 .62-3.27 1.76-4.4L12 5.27l4.24 4.38C17.38 10.77 17.99 12 18 14H6z',
  snowy:  'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22z',
  /** Stands in for the sun after dark — a gold sun over "TONIGHT" reads as wrong. */
  night:  'M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
}

/** WMO weather codes, bucketed. Ordered — the first `max` a code falls under wins. */
export const WEATHER_CONDITIONS = [
  { max: 1,  icon: 'sunny',  en: 'Clear',   ar: 'صحو'   },
  { max: 3,  icon: 'cloudy', en: 'Cloudy',  ar: 'غائم'  },
  { max: 49, icon: 'cloudy', en: 'Foggy',   ar: 'ضبابي' },
  { max: 69, icon: 'rainy',  en: 'Rain',    ar: 'ممطر'  },
  { max: 79, icon: 'snowy',  en: 'Snow',    ar: 'ثلوج'  },
  { max: 84, icon: 'rainy',  en: 'Showers', ar: 'زخات'  },
  { max: 99, icon: 'rainy',  en: 'Storms',  ar: 'عواصف' },
]

/**
 * @param code WMO code
 * @param lang 'en' | 'ar'
 * @param night true swaps a clear sky's sun for a moon
 * @returns { icon, cond, isSun } — isSun gates the gold fill; a gold cloud reads wrong.
 */
export function describeWeather(code, lang = 'en', night = false) {
  const m = WEATHER_CONDITIONS.find(x => Number(code) <= x.max) || WEATHER_CONDITIONS[1]
  const clear = m.icon === 'sunny'
  return {
    icon:  WEATHER_ICON[clear && night ? 'night' : m.icon],
    cond:  m[lang === 'ar' ? 'ar' : 'en'],
    isSun: clear && !night,
  }
}

const hourOf = iso => Number(String(iso).slice(11, 13))
const dayOf  = iso => String(iso).slice(0, 10)

/**
 * Reactive weather for one point, refreshed every 15 minutes.
 *
 * @param src getters: lat, lng, unit ('f' | 'c'), enabled
 * @returns data — null until the first successful read, then
 *   { now: {temp, code}, today: {high, low, code},
 *     tonight: {temp, code}, tomorrow: {high, low, code} }
 *   `tonight` is the 9 pm reading (the 3 am one once the evening is behind us, so an
 *   all-night board is not still promising tonight's weather at 2 am); it is null when
 *   the forecast window no longer covers it.
 */
export function useWeather(src) {
  const data = ref(null)
  let timer = null

  async function refresh() {
    const lat = Number(toValue(src.lat)), lng = Number(toValue(src.lng))
    if (!toValue(src.enabled)) return
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return
    const unit = toValue(src.unit) === 'c' ? 'celsius' : 'fahrenheit'
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${lat}&longitude=${lng}`
      + '&current=temperature_2m,weather_code'
      + '&hourly=temperature_2m,weather_code'
      + '&daily=temperature_2m_max,temperature_2m_min,weather_code'
      + `&temperature_unit=${unit}&timezone=auto&forecast_days=2`
    try {
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) return
      const j = await res.json()
      const num = (v, f = 0) => Math.round(Number(v ?? f))

      // Tonight: 9 pm today while the evening is ahead, 3 am tomorrow once it is not.
      let tonight = null
      const times = j.hourly?.time || []
      if (times.length) {
        const now = new Date()
        const today = j.daily?.time?.[0] || dayOf(times[0])
        const wantEvening = now.getHours() < 21
        const i = times.findIndex(t => wantEvening
          ? (dayOf(t) === today && hourOf(t) === 21)
          : (dayOf(t) !== today && hourOf(t) === 3))
        if (i >= 0) {
          tonight = { temp: num(j.hourly.temperature_2m?.[i]), code: num(j.hourly.weather_code?.[i]) }
        }
      }

      data.value = {
        now:     { temp: num(j.current?.temperature_2m), code: num(j.current?.weather_code) },
        today:   { high: num(j.daily?.temperature_2m_max?.[0]), low: num(j.daily?.temperature_2m_min?.[0]), code: num(j.daily?.weather_code?.[0]) },
        tonight,
        tomorrow: j.daily?.time?.[1]
          ? { high: num(j.daily.temperature_2m_max?.[1]), low: num(j.daily.temperature_2m_min?.[1]), code: num(j.daily.weather_code?.[1]) }
          : null,
      }
    } catch (_) {
      // Offline: keep the last reading rather than blanking the block.
    }
  }

  onMounted(() => {
    refresh()
    timer = setInterval(refresh, 15 * 60 * 1000)
  })
  onUnmounted(() => clearInterval(timer))
  watch(() => [toValue(src.lat), toValue(src.lng), toValue(src.unit), toValue(src.enabled)], refresh)

  return { data, refresh }
}
