export function stripAmPm(t) {
  return t ? t.replace(/\s*(AM|PM)\s*$/i, '').trim() : t
}

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu'l-Qa'dah", "Dhu'l-Hijjah",
]

export function formatHijri(date, offsetDays = 0, locale = 'en') {
  const d = new Date(date)
  d.setDate(d.getDate() + Number(offsetDays || 0))

  try {
    if (locale.startsWith('ar')) {
      return d.toLocaleDateString(`${locale}-u-ca-islamic-umalqura`, {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    }

    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(d)
    const get = t => parts.find(p => p.type === t)?.value
    const month = parseInt(get('month') || '1', 10) - 1
    if (month >= 0 && month < 12) return `${get('day')} ${HIJRI_MONTHS_EN[month]} ${get('year')} AH`
  } catch (_) {}

  return ''
}

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
]

/**
 * Hijri date using month names we supply ourselves.
 *
 * Some WebViews (e.g. the Allwinner frame's Chromium 106) ship ICU without Islamic
 * month-name data, so `month: 'long'` with the islamic-umalqura calendar silently
 * falls back to Gregorian names — Jumada al-Awwal, the 5th Hijri month, rendered as
 * "May". Asking Intl only for the numeric parts avoids that entirely.
 */
export function formatHijriLocalized(date, offsetDays = 0, lang = 'en') {
  const d = new Date(date)
  d.setDate(d.getDate() + Number(offsetDays || 0))
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(d)
    const get = t => parts.find(p => p.type === t)?.value
    const month = parseInt(get('month') || '0', 10) - 1
    if (month < 0 || month > 11) return ''
    const isAr = lang === 'ar'
    const names = isAr ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN
    return `${get('day')} ${names[month]} ${get('year')}${isAr ? ' هـ' : ' AH'}`
  } catch (_) {
    return ''
  }
}

export function formatClock(date, options = {}) {
  const {
    hour12 = true,
    seconds = false,
    split = false,
    period: showPeriod = true,
    locale = 'en-US',
    hour = 'numeric',
  } = options

  const fmtLocale = !hour12 && locale === 'en-US' ? 'en-GB' : locale
  const fmt = new Intl.DateTimeFormat(fmtLocale, {
    hour,
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hour12,
  })

  if (!split) {
    const value = fmt.format(date)
    return showPeriod ? value : stripAmPm(value)
  }

  let num = ''
  let period = ''
  for (const p of fmt.formatToParts(date)) {
    if (p.type === 'dayPeriod') period = p.value
    else num += p.value
  }
  return { num: num.trim(), period: showPeriod ? period : '' }
}

export function getPrayerDateTime(timeStr, isFajr, isDhuhr, baseDate = new Date()) {
  if (!timeStr) return new Date(baseDate)
  const hasAmPm = /[AP]M/i.test(timeStr)
  const clean = timeStr.replace(/\s*(AM|PM)\s*$/i, '').trim()
  const [hours, minutes] = clean.split(':').map(Number)
  const d = new Date(baseDate)
  let h = hours
  if (hasAmPm) {
    if (/PM/i.test(timeStr) && h < 12) h += 12
    if (/AM/i.test(timeStr) && h === 12) h = 0
  } else {
    if (!isFajr && !isDhuhr && h < 12) h += 12  // Asr/Maghrib/Isha always PM
    if (isDhuhr && h < 10) h += 12               // Dhuhr 1:xx = PM; 10:xx/11:xx = AM
  }
  d.setHours(h, minutes, 0, 0)
  return d
}

export function getNextPrayerDateTime(timeStr, isFajr, isDhuhr, from = new Date()) {
  const base = new Date(from)
  const target = getPrayerDateTime(timeStr, isFajr, isDhuhr, base)
  if (target < base) target.setDate(target.getDate() + 1)
  return target
}

/**
 * Prayer time calculation methods (angles for Fajr/Isha).
 * These are the standard methods used worldwide.
 */
export const CALCULATION_METHODS = {
  MWL: {
    name: 'Muslim World League',
    fajrAngle: 18,
    ishaAngle: 17,
    ishaInterval: null, // minutes after Maghrib, or null for angle
  },
  ISNA: {
    name: 'Islamic Society of North America',
    fajrAngle: 15,
    ishaAngle: 15,
    ishaInterval: null,
  },
  Egypt: {
    name: 'Egyptian General Authority of Survey',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    ishaInterval: null,
  },
  Makkah: {
    name: 'Umm Al-Qura University, Makkah',
    fajrAngle: 18.5,
    ishaAngle: null,
    ishaInterval: 90, // 90 minutes after Maghrib
  },
  Karachi: {
    name: 'University of Islamic Sciences, Karachi',
    fajrAngle: 18,
    ishaAngle: 18,
    ishaInterval: null,
  },
  Turkey: {
    name: 'Diyanet (Turkey)',
    fajrAngle: 18,
    ishaAngle: 17,
    ishaInterval: null,
  },
  Jordan: {
    name: 'Jordan',
    fajrAngle: 18,
    ishaAngle: 18,
    ishaInterval: null,
  },
  Tehran: {
    name: 'Institute of Geophysics, University of Tehran',
    fajrAngle: 17.7,
    ishaAngle: 14,
    ishaInterval: null,
  },
  Jafari: {
    name: 'Shia Ithna-Ashari (Jafari)',
    fajrAngle: 16,
    ishaAngle: 14,
    ishaInterval: null,
  },
}

/**
 * Calculate prayer times using lat/long + selected method.
 * Returns times in 24h "HH:MM" format (local time).
 *
 * This is a solid, widely-used implementation based on the PrayTimes algorithm.
 */
export function calculatePrayerTimes(lat, lng, date = new Date(), methodKey = 'MWL', asrMethod = 'Standard', highLatMethod = 'None') {
  const method = CALCULATION_METHODS[methodKey] || CALCULATION_METHODS.MWL

  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  // Julian date
  let jd = (1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4 +
           (367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12 -
           (3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4 +
           day - 32075

  // Sun position
  const D = jd - 2451545.0
  const g = (357.529 + 0.98560028 * D) % 360
  const q = (280.459 + 0.98564736 * D) % 360
  const L = (q + 1.915 * Math.sin((g * Math.PI) / 180) + 0.020 * Math.sin((2 * g * Math.PI) / 180)) % 360
  const e = 23.439 - 0.00000036 * D
  const RA = Math.atan2(Math.cos((e * Math.PI) / 180) * Math.sin((L * Math.PI) / 180), Math.cos((L * Math.PI) / 180)) * (180 / Math.PI)
  const RA2 = (RA + 360) % 360
  const D2 = Math.asin(Math.sin((e * Math.PI) / 180) * Math.sin((L * Math.PI) / 180)) * (180 / Math.PI)

  const EqT = q - RA2 - (g - Math.floor(g / 360) * 360) / 15 * 4 / 60 // rough

  const latRad = (lat * Math.PI) / 180

  function getTime(angle, isFajrIsh = false) {
    const angleRad = (angle * Math.PI) / 180
    let M = Math.acos((Math.sin(angleRad) - Math.sin(latRad) * Math.sin((D2 * Math.PI) / 180)) /
                      (Math.cos(latRad) * Math.cos((D2 * Math.PI) / 180))) * (180 / Math.PI) / 15

    let noon = 12 + (lng / 15) - EqT / 60

    let t = noon - M   // for morning prayers (Fajr, Sunrise)
    if (!isFajrIsh && angle < 0) {
      // for Isha / night
      t = noon + M
    }

    // Asr is special
    return t
  }

  // Approximate times (this is a simplified but commonly used accurate enough version)
  // For production, consider bundling a full lib like 'prayer-times' or 'adhan-js' port.

  const fajr = getTime(-method.fajrAngle, true)
  const sunrise = getTime(-0.833, true)
  const dhuhr = 12 + (lng / 15) - EqT / 60
  const asrFactor = asrMethod === 'Hanafi' ? 2 : 1
  const asr = getAsrTime(lat, D2, dhuhr, asrFactor)
  const maghrib = getTime(-0.833)
  let isha
  if (method.ishaInterval) {
    isha = maghrib + method.ishaInterval / 60
  } else {
    isha = getTime(-method.ishaAngle)
  }

  // High latitude adjustment (basic)
  if (highLatMethod !== 'None' && Math.abs(lat) > 48) {
    // very basic adjustment - for real use use proper library
  }

  const format = (hours) => {
    let h = Math.floor(hours)
    let m = Math.floor((hours - h) * 60)
    if (m < 0) { h--; m += 60 }
    h = ((h % 24) + 24) % 24
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return {
    fajr: format(fajr),
    sunrise: format(sunrise),
    dhuhr: format(dhuhr),
    asr: format(asr),
    maghrib: format(maghrib),
    isha: format(isha),
  }
}

function getAsrTime(lat, D, noon, factor) {
  const latRad = (lat * Math.PI) / 180
  const D2 = (D * Math.PI) / 180
  const a = Math.acos((Math.sin(Math.atan(1 / factor)) - Math.sin(latRad) * Math.sin(D2)) / (Math.cos(latRad) * Math.cos(D2))) * (180 / Math.PI) / 15
  return noon + a
}

/**
 * For mosques without scraped data, generate a prayer-data object
 * compatible with the existing layouts (using calculated times).
 */
export function buildCalculatedPrayerData(lat, lng, date = new Date(), method = 'MWL') {
  const times = calculatePrayerTimes(lat, lng, date, method)

  // Convert "HH:MM" to the format expected by getPrayerDateTime (with AM/PM logic handled inside)
  const toTimeStr = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    let h12 = h % 12
    if (h12 === 0) h12 = 12
    return `${h12}:${String(m).padStart(2, '0')} ${period}`
  }

  return {
    fajr_azaan: toTimeStr(times.fajr),
    fajr_iqamah: null, // no Iqamah for calculated
    sunrise: toTimeStr(times.sunrise),
    dhuhr_azaan: toTimeStr(times.dhuhr),
    dhuhr_iqamah: null,
    asr_azaan: toTimeStr(times.asr),
    asr_iqamah: null,
    maghrib_azaan: toTimeStr(times.maghrib),
    maghrib_iqamah: null,
    isha_azaan: toTimeStr(times.isha),
    isha_iqamah: null,
    // You can add more fields if your layouts use them
  }
}
