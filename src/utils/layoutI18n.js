import { computed } from 'vue'

/**
 * Shared English/Arabic strings for the dashboard layouts.
 *
 * Every layout takes a `lang` prop ('en' | 'ar') fed by the `<prefix>_lang` URL
 * param and the native toolbar's setL<N>Style hook. Layout-specific wording is
 * passed to useLayoutLang() as an `extra` map rather than being added here, so
 * this table stays the vocabulary the layouts actually share.
 */
export const LAYOUT_TEXT = {
  en: {
    fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
    prayer: 'Prayer', adhan: 'Adhan', iqamah: 'Iqamah', sunrise: 'Sunrise',
    adhanCaps: 'ADHAN', iqamahCaps: 'IQAMAH', sunriseCaps: 'SUNRISE',
    next: 'NEXT PRAYER', remaining: 'Remaining', in: 'in',
    adhanIn: 'ADHAN IN', iqamahIn: 'IQAMAH IN', khutbahIn: 'KHUTBAH IN',
    jumuah: "Jumu'ah", khateeb: 'KHATEEB', khutbahStartsAt: 'KHUTBAH STARTS AT',
    tomorrow: 'Tomorrow', nowPlaying: 'Now Playing',
    mute: 'Mute adhan', unmute: 'Unmute adhan', mosqueLogo: 'Mosque logo',
  },
  ar: {
    fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
    prayer: 'الصلاة', adhan: 'الأذان', iqamah: 'الإقامة', sunrise: 'الشروق',
    adhanCaps: 'الأذان', iqamahCaps: 'الإقامة', sunriseCaps: 'الشروق',
    next: 'الصلاة القادمة', remaining: 'المتبقي', in: 'بعد',
    adhanIn: 'الأذان بعد', iqamahIn: 'الإقامة بعد', khutbahIn: 'الخطبة بعد',
    jumuah: 'الجمعة', khateeb: 'الخطيب', khutbahStartsAt: 'تبدأ الخطبة',
    tomorrow: 'غداً', nowPlaying: 'يُبثّ الآن',
    mute: 'كتم الأذان', unmute: 'تشغيل الأذان', mosqueLogo: 'شعار المسجد',
  },
}

/** Arabic locale pinned to Latin digits — the layouts are designed around them. */
export const AR_LOCALE = 'ar-u-nu-latn'

/**
 * Resolves a layout's `lang` prop into the pieces every layout needs.
 *
 * @param props     the component's props (read reactively; must carry `lang`)
 * @param extra     optional { en: {...}, ar: {...} } merged over LAYOUT_TEXT
 * @returns lang       'en' | 'ar'
 *          dir        'ltr' | 'rtl', for the root element's :dir binding
 *          T          the resolved string table
 *          localeTag  for formatClock()/toLocaleDateString(): 'en-US' | AR_LOCALE
 *          dateLocale like localeTag, but keeps the browser default for English —
 *                     use it where the layout already passed [] to toLocaleDateString
 */
export function useLayoutLang(props, extra = null) {
  const lang = computed(() => (props.lang === 'ar' ? 'ar' : 'en'))
  const dir = computed(() => (lang.value === 'ar' ? 'rtl' : 'ltr'))
  const T = computed(() => ({ ...LAYOUT_TEXT[lang.value], ...(extra?.[lang.value] || {}) }))
  const localeTag = computed(() => (lang.value === 'ar' ? AR_LOCALE : 'en-US'))
  const dateLocale = computed(() => (lang.value === 'ar' ? AR_LOCALE : []))
  return { lang, dir, T, localeTag, dateLocale }
}
