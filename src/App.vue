<template>
  <MosqueSearch v-if="showSearch" @mosque-selected="onMosqueSelected" />
  <template v-else>
    <MainLayout
      v-if="!isLayoutMode"
      :prayer-data="activePrayerData"
      :bg-key="bgParam"
      :bg-map="bgMap"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :lang="mainLang"
      :radio-name="radioName"
      :is-radio-playing="isRadioPlaying"
      :status="status"
      v-bind="displayProps"
    />
    <ArabicLayout
      v-else-if="bgParam === 'layout-1'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l1NightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :lang="l1Lang"
      :focus-bg="l1Focus.bg"
      :focus-opacity="l1Focus.opacity"
      :focus-photo="l1Focus.photo"
      :focus-oled="l1Focus.oled"
      :focus-dim-default="l1Focus.dim"
      :focus-clock="l1Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l1Photo.image"
      :photo-repeat="l1Photo.repeat"
      :text-color="l1Text"
      :accent-color="l1Accent"
      :bg-color="l1Bg"
      :surface-color="l1Surface"
      :adhan-scale="l1AdhanScale"
      :iqamah-scale="l1IqamahScale"
      :show-weather="l1ShowWeather"
      :weather-unit="l1WeatherUnit"
      :lat="calcLat || mosqueLat"
      :lng="calcLng || mosqueLng"
      :focus-interval-sec="focusIntervalSec"
      v-bind="displayProps"
    />
    <Layout2
      v-else-if="bgParam === 'layout-2'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l2NightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :mosque-url="mosqueUrl"
      :lang="l2Lang"
      :focus-bg="l2Focus.bg"
      :focus-opacity="l2Focus.opacity"
      :focus-photo="l2Focus.photo"
      :focus-oled="l2Focus.oled"
      :focus-dim-default="l2Focus.dim"
      :focus-clock="l2Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l2Photo.image"
      :photo-repeat="l2Photo.repeat"
      :text-color="l2Text"
      :accent-color="l2Accent"
      :bg-color="l2Bg"
      :surface-color="l2Surface"
      :muted-text-color="l2MutedText"
      :secondary-text-color="l2SecondaryText"
      :subtle-text-color="l2SubtleText"
      :highlight-text-color="l2HighlightText"
      :adhan-scale="l2AdhanScale"
      :iqamah-scale="l2IqamahScale"
      :focus-interval-sec="focusIntervalSec"
      v-bind="displayProps"
    />
    <Layout3
      v-else-if="bgParam === 'layout-3'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :lang="l3Lang"
      :focus-bg="l3Focus.bg"
      :focus-opacity="l3Focus.opacity"
      :focus-photo="l3Focus.photo"
      :focus-clock="l3Focus.clock"
      :focus-oled="l3Focus.oled"
      :focus-dim-default="l3Focus.dim"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l3Photo.image"
      :photo-repeat="l3Photo.repeat"
      :night-focus-after-isha-min="l3NightFocus"
      :is-athan-playing="isAthanPlaying"
      :is-athan-muted="isAthanMuted"
      @toggle-athan-mute="toggleAthanMute"
      @stop-athan="stopAthan"
      :text-color="l3Text"
      :accent-color="l3Accent"
      :bg-color="l3Bg"
      :surface-color="l3Surface"
      :adhan-scale="l3AdhanScale"
      :iqamah-scale="l3IqamahScale"
      :focus-interval-sec="focusIntervalSec"
      v-bind="displayProps"
    />
    <Layout4
      v-else-if="bgParam === 'layout-4'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l4NightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :lang="l4Lang"
      :focus-bg="l4Focus.bg"
      :focus-opacity="l4Focus.opacity"
      :focus-photo="l4Focus.photo"
      :focus-oled="l4Focus.oled"
      :focus-dim-default="l4Focus.dim"
      :focus-clock="l4Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l4Photo.image"
      :photo-repeat="l4Photo.repeat"
      :text-color="l4Text"
      :accent-color="l4Accent"
      :bg-color="l4Bg"
      :surface-color="l4Surface"
      :adhan-scale="l4AdhanScale"
      :iqamah-scale="l4IqamahScale"
      :focus-interval-sec="focusIntervalSec"
      :show-weather="l4ShowWeather"
      :weather-unit="l4WeatherUnit"
      :lat="calcLat || mosqueLat"
      :lng="calcLng || mosqueLng"
      v-bind="displayProps"
    />
    <Layout5
      v-else-if="bgParam === 'layout-5'"
      :prayer-data="activePrayerData"
      :tomorrow-prayer-data="activeTomorrowData"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :mosque-id="mosqueId"
      :lang="l5Lang"
      :text-color="l5Text"
      :accent-color="l5Accent"
      :bg-color="l5Bg"
      :bg-image="l5ResolvedBgImage"
      :bg-repeat="l5BgRepeat"
      :adhan-size="l5AdhanSize"
      :iqamah-size="l5IqamahSize"
      :top-padding="l5TopPadding"
      :rotation="l5Rotation"
      :active-row-color="l5ActiveRowColor"
      :active-row-opacity="l5ActiveRowOpacity"
      :logo-url="l5LogoUrl"
      :logo-width="l5LogoWidth"
      :period-style="l5PeriodStyle"
      :show-countdown="l5ShowCountdown"
      :show-change-alert="l5ShowChangeAlert"
      :message-alignment="l5MessageAlignment"
      v-bind="displayProps"
    />
    <Layout7
      v-else-if="bgParam === 'layout-7'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l7NightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :lang="l7Lang"
      :focus-bg="l7Focus.bg"
      :focus-opacity="l7Focus.opacity"
      :focus-photo="l7Focus.photo"
      :focus-oled="l7Focus.oled"
      :focus-dim-default="l7Focus.dim"
      :focus-clock="l7Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l7Photo.image"
      :photo-repeat="l7Photo.repeat"
      :text-color="l7Text"
      :accent-color="l7Accent"
      :bg-color="l7Bg"
      :surface-color="l7Surface"
      :adhan-scale="l7AdhanScale"
      :iqamah-scale="l7IqamahScale"
      :countdown-scale="l7CountdownScale"
      :focus-interval-sec="focusIntervalSec"
      v-bind="displayProps"
    />
    <Layout8
      v-else-if="bgParam === 'layout-8'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="texNightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :lang="texLang"
      :radio-name="radioName"
      :is-radio-playing="isRadioPlaying"
      :status="status"
      :svg-path-color="svgColor"
      :sidebar-bg="sidebarBg"
      :sidebar-text-color="sidebarText"
      :sidebar-accent-color="sidebarAccent"
      :main-bg="mainBg"
      :primary-color="primaryColor"
      :tile-color="tileColor"
      :secondary-color="secondaryColor"
      :focus-interval-sec="focusIntervalSec"
      :focus-bg="texFocus.bg"
      :focus-opacity="texFocus.opacity"
      :focus-photo="texFocus.photo"
      :focus-oled="texFocus.oled"
      :focus-dim-default="texFocus.dim"
      :focus-clock="texFocus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :bg-image="texBgImage"
      :bg-repeat="texBgRepeat"
      :adhan-scale="texAdhanScale"
      :iqamah-scale="texIqamahScale"
      v-bind="displayProps"
    />
    <Layout9
      v-else-if="bgParam === 'layout-9'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l9NightFocus"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :mosque-url="mosqueUrl"
      :lang="l9Lang"
      :focus-bg="l9Focus.bg"
      :focus-opacity="l9Focus.opacity"
      :focus-photo="l9Focus.photo"
      :focus-oled="l9Focus.oled"
      :focus-dim-default="l9Focus.dim"
      :focus-clock="l9Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :status="status"
      :tile-color="l9TileColor"
      :secondary-color="l9SecondaryColor"
      :accent-color="l9AccentColor"
      :circle-color="l9CircleColor"
      :main-bg="l9MainBg"
      :bg-image="l9BgImage"
      :bg-repeat="l9BgRepeat"
      :adhan-scale="l9AdhanScale"
      :iqamah-scale="l9IqamahScale"
      :focus-interval-sec="focusIntervalSec"
      v-bind="displayProps"
    />
    <Layout10
      v-else-if="bgParam === 'layout-10'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :night-focus-after-isha-min="l10NightFocus"
      :focus-interval-sec="focusIntervalSec"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :lang="l10Lang"
      :focus-bg="l10Focus.bg"
      :focus-opacity="l10Focus.opacity"
      :focus-photo="l10Focus.photo"
      :focus-oled="l10Focus.oled"
      :focus-dim-default="l10Focus.dim"
      :focus-clock="l10Focus.clock"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :photo-image="l10Photo.image"
      :photo-repeat="l10Photo.repeat"
      :primary-color="l10PrimaryColor"
      :secondary-color="l10SecondaryColor"
      :accent-color="l10AccentColor"
      :panel-color="l10PanelColor"
      :surface-color="l10SurfaceColor"
      :clock-scale="l10ClockScale"
      :arabic-scale="l10ArabicScale"
      :list-scale="l10ListScale"
      :orb-scale="l10OrbScale"
      v-bind="displayProps"
    />
    <Layout11
      v-else-if="bgParam === 'layout-11'"
      :prayer-data="activePrayerData"
      :today-prayer-data="prayerData"
      :base-date="activePrayerBaseDate"
      :next-prayer-key="nextPrayerKey"
      :jumuah-prayers="fridayJumuah"
      :mosque-name="mosqueName"
      :lang="l11Lang"
      :accent-color="l11Accent"
      :adhan-scale="l11AdhanScale"
      :iqamah-scale="l11IqamahScale"
      :card-style="l11CardStyle"
      :card-opacity="l11CardOpacity"
      :contrast="l11Contrast"
      :bg-image="l11BgImage"
      :night-after-isha-min="l11NightAfterIsha"
      :lat="calcLat || mosqueLat"
      :lng="calcLng || mosqueLng"
      :show-weather="l11ShowWeather"
      :weather-unit="l11WeatherUnit"
      :focus-interval-sec="focusIntervalSec"
      :is-athan-playing="isAthanPlaying"
      :is-athan-muted="isAthanMuted"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :countdown-lead-min="countdownLead"
      @toggle-athan-mute="toggleAthanMute"
      @stop-athan="stopAthan"
      v-bind="displayProps"
    />
    <PrayerInterrupt
      v-if="showPrayerInterrupt"
      :prayer-data="activePrayerData"
      :base-date="activePrayerBaseDate"
      :lang="interruptLang"
      :accent-color="interruptAccent"
      :is-athan-playing="isAthanPlaying"
      :is-athan-muted="isAthanMuted"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :countdown-lead-min="countdownLead"
      :time-format="displayProps.timeFormat"
      :screens="interruptScreens"
      :restore-token="interruptRestoreToken"
      @toggle-athan-mute="toggleAthanMute"
      @stop-athan="stopAthan"
    />

    <JumuahScreen
      v-if="jumuahScreenActive"
      :prayers="jumuahPrayers"
      :lang="interruptLang"
      :accent-color="interruptAccent"
      :bg-color="interruptBg"
      :text-color="interruptText"
      :time-format="displayProps.timeFormat"
      :mosque-name="mosqueName"
      @pointerdown="onEventsPointerDown"
      @pointerup="onEventsPointerUp"
      @pointercancel="eventsSwipeStart = null"
    />

    <EventsScreen
      v-if="eventsFace"
      :face="eventsFace"
      :events="eventsForFace"
      :lang="interruptLang"
      :accent-color="interruptAccent"
      :bg-color="interruptBg"
      :text-color="interruptText"
      :time-format="displayProps.timeFormat"
      :seconds-to-iqamah="secondsToIqamah"
      :countdown-label="iqamahCountdownLabel"
      :turn="slideTurn"
      @pointerdown="onEventsPointerDown"
      @pointerup="onEventsPointerUp"
      @pointercancel="eventsSwipeStart = null"
    />

    <audio ref="adhanAudioEl" src="./azan2.mp3" preload="auto" crossorigin="anonymous" />
    <audio ref="radioAudioEl" crossorigin="anonymous" preload="none" />

    <div
      v-if="isAthanPlaying && !LAYOUTS_WITH_OWN_MUTE.includes(bgParam) && !interruptScreens.includes('athan')"
      class="athan-toggle"
      @click="toggleAthanMute"
    >
      <img :src="athanIconSrc" :class="{ muted: isAthanMuted }" />
    </div>
  </template>
  <DebugToolbar
      v-if="debugMode"
      :offset-ms="debugOffsetMs"
      :now-ms="nowMs"
      :jumps="debugJumps"
      :night-focus-at="debugNightFocusAt"
      :athan-playing="isAthanPlaying"
      :countdown-for="countdownFor"
      :countdown-sunrise="countdownSunrise"
      :countdown-lead="countdownLead"
      :dark-mode-pref="darkModePref"
      :dark-now="isDarkMode"
      @set-countdown-for="v => countdownFor = v"
      @set-countdown-lead="v => countdownLead = v"
      @set-dark-mode="v => darkModePref = v"
      @nudge="nudgeDebugNow"
      @jump="setDebugNow"
      @set-offset="setDebugOffset"
      @toggle-view="debugToggleView"
      @toggle-athan="debugToggleAthan"
    />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, watchEffect } from 'vue'
const Hls = window.Hls
import MainLayout from './components/MainLayout.vue'
import ArabicLayout from './components/ArabicLayout.vue'
import Layout2 from './components/Layout2.vue'
import Layout3 from './components/Layout3.vue'
import Layout4 from './components/Layout4.vue'
import Layout5 from './components/Layout5.vue'
import Layout7 from './components/Layout7.vue'
import Layout8 from './components/Layout8.vue'
import Layout9 from './components/Layout9.vue'
import Layout10 from './components/Layout10.vue'
import Layout11 from './components/Layout11.vue'
import PrayerInterrupt from './components/PrayerInterrupt.vue'
import EventsScreen from './components/EventsScreen.vue'
import JumuahScreen from './components/JumuahScreen.vue'
import MosqueSearch from './components/MosqueSearch.vue'
import DebugToolbar from './components/DebugToolbar.vue'
import { clockOffsetMs as debugClockOffset, debugEnabled } from './utils/debugClock.js'
import mcaLogoPng from './assets/mca-logo.png'
import { getPrayerDateTime } from './utils/prayerTime.js'
import { clampCqi, withSupportedUnits } from './utils/cssUnits'
import { computeDarkMode, parseDarkBrightness } from './utils/darkMode.js'
import { isOpaqueColor } from './utils/colorAdjust.js'
import { resolveMosqueLocation } from './utils/mosqueLocation.js'
import { loadEvents, resolveMosqueId, remainingToday, upcoming, filterByVenue } from './utils/eventsFeed.js'
import { loadJumuahPrayers, nextJumuahIndex, jumuahDate, jumuahName } from './utils/jumuah.js'
import { countdownKinds, countdownLeadMs, findNextEvent } from './utils/prayerCountdown.js'
import {
  slideDue as rotationSlideDue, slideTurn, slotTick,
  setRotationInterval, setSlideReady, holdRotation, skipSlideSlot,
} from './utils/viewRotation.js'
import {
  trackSession, trackAthanPlayed, trackAthanMuted, trackAthanUnmuted,
  trackMosqueSelected, trackRadioStarted, trackRadioStopped,
} from './utils/analytics.js'

const params = new URLSearchParams(window.location.search)
const bgParam        = params.get('bg')         || 'no-repeat-3'
const adhanParam     = params.get('adhan')      || 'adhan-egypt'
const fajrAdhanParam = params.get('fajr_adhan') || 'fajir'
const boolParam = (name, fallback = true) => {
  const value = params.get(name)
  return value == null ? fallback : value !== 'false'
}
// Every layout takes its own `<prefix>_lang`; a bare ?lang= sets the default for
// all of them, which is also the only language control the default (non-layout)
// view has. 'en' | 'ar'.
const langParam = params.get('lang') === 'ar' ? 'ar' : params.get('lang') === 'en' ? 'en' : null
const layoutLang = (name, fallback = 'en') => ref(params.get(name) || langParam || fallback)
const mainLang = ref(langParam || 'en')

const darkModePref      = ref(params.get('dark_mode') || 'auto')
const darkStartKey      = params.get('dark_start') || 'maghrib_iqamah'
// Night runs to sunrise, not to Fajr: the hall is still dark through the Fajr prayer.
const darkEndKey        = params.get('dark_end') || 'sunrise'
const darkStartOffset   = parseInt(params.get('dark_start_offset') || '0', 10)
const darkEndOffset     = parseInt(params.get('dark_end_offset') || '0', 10)
const darkBrightness    = parseDarkBrightness(params.get('dark_brightness'))

const backdropColor   = ref(params.get('backdrop_color')   || '#000000')
const backdropOpacity = ref(params.get('backdrop_opacity') || '0')

// Native-configurable colors for the Islamic Texture (layout-8) toolbar.
// Reactive so window.setLayoutColors() can update them live (no reload).
const svgColor     = ref(params.get('svg_color')     || '#cd7f32')
const sidebarBg    = ref(params.get('sidebar_bg')    || 'rgba(8,8,8,0.94)')
const sidebarText  = ref(params.get('sidebar_text')  || '#FFFFFF')
const sidebarAccent = ref(params.get('sidebar_accent') || '#cd7f32')
const mainBg       = ref(params.get('main_bg')       || '#081018')
const primaryColor = ref(params.get('primary_color') || '#cd7f32')
const tileColor    = ref(params.get('tile_color')    || '#ffffff')
const secondaryColor = ref(params.get('secondary_color') || '#000000')
const texDefaultBgImage = 'https://tv.getathan.com/prayer-dash/assets/frame-masjid.jpg'
// Inlined rather than using imageParamOrDefault(): that helper is declared further
// down, so calling it here hits the temporal dead zone and breaks every layout.
// params.has() keeps an explicitly-empty value meaning 'no photo'.
const texBgImage   = ref(params.has('tex_bg_image') ? (params.get('tex_bg_image') ?? '') : texDefaultBgImage)
const texBgRepeat  = ref(params.get('tex_bg_repeat') || 'false')
const texAdhanScale  = ref(params.get('tex_adhan_scale')  || '1.15')
const texIqamahScale = ref(params.get('tex_iqamah_scale') || '1.2')
const texLogoWidth   = ref(withSupportedUnits(params.get('tex_logo_width')) || clampCqi('59px', 9.1, '85px'))
const focusIntervalSec = ref(parseInt(params.get('focus_interval') ?? '30'))
const texNightFocus    = ref(params.get('tex_night_focus') || '20')
const texLang          = layoutLang('tex_lang')
const normalizeLocalAssetPath = value => String(value || '').replace(/^\/prayer-dash\/assets\//, 'assets/')
const imageParamOrDefault = (name, defaultValue) =>
  params.has(name) ? normalizeLocalAssetPath(params.get(name) ?? '') : defaultValue

// Layout 9 (Masidal) — colors + background + sizes.
const l9TileColor      = ref(params.get('l9_tile_color')     || '#ffffff')
const l9SecondaryColor = ref(params.get('l9_secondary_color')|| '#111111')
const l9AccentColor    = ref(params.get('l9_accent_color')   || '#2cb1b6')
const l9CircleColor    = ref(params.get('l9_circle_color')   || '#c31b1b')
const l9MainBg         = ref(params.get('l9_main_bg')        || '#e0e0e0')
const l9DefaultBgImage = 'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/layout-9-bg.png'
const l9BgImage        = ref(imageParamOrDefault('l9_bg_image', l9DefaultBgImage))
const l9BgRepeat       = ref(params.get('l9_bg_repeat')      || 'false')
const l9AdhanScale     = ref(params.get('l9_adhan_scale')    || '1.3')
const l9IqamahScale    = ref(params.get('l9_iqamah_scale')   || '1.3')
const l9NightFocus     = ref(params.get('l9_night_focus')    || '20')
const l9Lang           = layoutLang('l9_lang')

// Layout 10 — rotating photos, color-only customization.
const l10LegacyText   = params.get('l10_text_color')
const l10PrimaryColor   = ref(params.get('l10_primary_color')   || l10LegacyText || '#ffffff')
const l10SecondaryColor = ref(params.get('l10_secondary_color') || l10LegacyText || '#050505')
const l10AccentColor  = ref(params.get('l10_accent_color')  || '#e4c45a')
const l10PanelColor   = ref(params.get('l10_panel_color')   || '#062247')
const l10SurfaceColor = ref(params.get('l10_surface_color') || '#F8F8F8')
const l10ClockScale   = ref(params.get('l10_clock_scale')   || '1')
const l10ArabicScale  = ref(params.get('l10_arabic_scale')  || '1')
const l10ListScale    = ref(params.get('l10_list_scale')    || '1')
const l10OrbScale     = ref(params.get('l10_orb_scale')     || '1')
const l10LogoWidth    = ref(withSupportedUnits(params.get('l10_logo_width')) || clampCqi('59px', 9.1, '85px'))
const l10NightFocus   = ref(params.get('l10_night_focus')   || '20')
const l10Lang         = layoutLang('l10_lang')

// Layout 11 (Prayer Frame) — Material 3 frame design with its own screen rotation.
const l11DefaultBgImage = 'https://tv.getathan.com/prayer-dash/assets/frame-masjid.jpg'
const l11Lang         = layoutLang('l11_lang')
const l11Accent       = ref(params.get('l11_accent')       || '#8fd8a8')
const l11CardStyle    = ref(params.get('l11_card_style')   || 'dark')
const l11CardOpacity  = ref(params.get('l11_card_opacity') || '100')
const l11Contrast     = ref(params.get('l11_contrast')     || '')
const l11BgImage      = ref(imageParamOrDefault('l11_bg_image', l11DefaultBgImage))
const l11NightAfterIsha = ref(params.get('l11_night_after_isha') || '20')
const l11ShowWeather  = ref(boolParam('l11_show_weather', true))
const l11WeatherUnit  = ref(params.get('l11_weather_unit') || 'f')
// Modern Tiles draws today / tonight / tomorrow in the band beside its hero.
const l4ShowWeather   = ref(params.get('l4_weather') !== 'weather_off')
const l4WeatherUnit   = ref(params.get('l4_weather_unit') || 'f')
// Heritage Panel draws the same widget beside its hero.
const l1ShowWeather   = ref(params.get('l1_weather') !== 'weather_off')
const l1WeatherUnit   = ref(params.get('l1_weather_unit') || 'f')
const l11AdhanScale   = ref(params.get('l11_adhan_scale')  || '1')
const l11IqamahScale  = ref(params.get('l11_iqamah_scale') || '1')
// Countdown / athan interrupt screens. Shared by every layout: the Prayer Frame and
// Classic Ivory draw their own, the rest get PrayerInterrupt.vue. Each layout's
// toolbar emits its own <prefix>_countdown_* param, so these settings are read by
// suffix rather than through a ref per layout.
//
// The apps send EVERY layout's controls on the URL, not just the running one's, so
// a bare suffix match returned whichever layout happened to come first in the query
// string — layout-8's, in practice. That silently applied another layout's Events
// Card / countdown settings to the board. The active layout's own value wins now,
// and the suffix scan is only the fallback for a hand-written URL.
const LAYOUT_PREFIX_OVERRIDES = { 'layout-8': 'tex' }
const activeLayoutPrefix = LAYOUT_PREFIX_OVERRIDES[bgParam] ||
  (bgParam.startsWith('layout-') ? 'l' + bgParam.slice('layout-'.length) : '')
const paramEndingWith = suffix => {
  if (activeLayoutPrefix) {
    const own = params.get(`${activeLayoutPrefix}_${suffix}`)
    if (own != null && own !== '') return own
  }
  for (const [k, v] of params.entries()) if (k === suffix || k.endsWith('_' + suffix)) return v
  return null
}
const countdownFor  = ref(paramEndingWith('countdown_for')  || 'athan')
const countdownLead = ref(paramEndingWith('countdown_lead') || '1')
// Opt-in: sunrise is not a prayer, so a board only counts down to it when asked.
const countdownSunrise = ref(paramEndingWith('countdown_sunrise') === 'true')

// Masjid events. The week card joins the board's rotation; the after-athan screen
// fills the gap between an athan and its iqamah. Both off-switchable per mosque.
const eventsCard       = ref(paramEndingWith('events_card')  || 'on')
const eventsAfterAthan = ref(paramEndingWith('events_after') || '10')
const eventsVenue      = ref(paramEndingWith('events_venue') || '')
// The prayer feed has no location, so the frame's weather block gets its coordinates
// from the mosque directory (cached per mosque id). lat/lng passed on the URL — which
// only calculated mosques have — still win.
/** The mosque's coordinates, for whichever layout draws weather. */
const mosqueLat = ref(null)
const mosqueLng = ref(null)

// Layout5 (Vertical Board) — its own color + font-size knobs, independent of layout-8.
const l5Text       = ref(params.get('l5_text')        || '#FFFFFF')
const l5Accent     = ref(params.get('l5_accent')      || '#E8A020')
const l5Bg         = ref(params.get('l5_bg')          || 'transparent')
const l5BgImage    = ref(params.get('l5_bg_image')    || 'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/bg-222.jpg')
const l5BgRepeat   = ref(params.get('l5_bg_repeat')   || 'false')
const l5CustomBgImage = ref(params.get('l5_custom_bg_image') || '')
const l5AdhanSize  = ref(params.get('l5_adhan_size')  || '1.8em')
const l5IqamahSize = ref(params.get('l5_iqamah_size') || '1.9em')
const l5TopPadding = ref(params.get('l5_top_padding') || '205px')
const l5Rotation   = ref(params.get('l5_rotation')    || '90deg')
const l5ActiveRowColor   = ref(params.get('l5_active_row_color')   || '#FFFFFF')
const l5ActiveRowOpacity = ref(params.get('l5_active_row_opacity') || '0.15')
const l5LogoUrl          = ref(params.get('l5_logo_url')           || '')
const l5LogoWidth        = ref(withSupportedUnits(params.get('l5_logo_width'), { rotated: true })
  || clampCqi('59px', 9.1, '85px'))
const l5PeriodStyle      = ref(params.get('l5_period_style')       || 'off')
const l5ShowCountdown    = ref(params.get('l5_show_countdown')     !== 'false')
const l5ShowChangeAlert  = ref(params.get('l5_show_change_alert')  !== 'false')
const l5MessageAlignment = ref(params.get('l5_message_alignment')  || 'left')
const l5Lang             = layoutLang('l5_lang')
const l5ResolvedBgImage  = computed(() => l5CustomBgImage.value.trim() || l5BgImage.value)

// Layout1 (Arabic) and Layout2 colors — Text, Accent, Background, Surface.
const l1Text    = ref(params.get('l1_text')    || '#F1F5F9')
const l1Accent  = ref(params.get('l1_accent')  || '#2DD4BF')
const l1Bg      = ref(params.get('l1_bg')      || '#0B1426')
const l1Surface = ref(params.get('l1_surface') || '#0F1D35')
const l1AdhanScale  = ref(params.get('l1_adhan_scale')  || '1')
const l1IqamahScale = ref(params.get('l1_iqamah_scale') || '1')
const l1LogoWidth   = ref(withSupportedUnits(params.get('l1_logo_width')) || clampCqi('59px', 9.1, '85px'))
const l1NightFocus  = ref(params.get('l1_night_focus')  || '20')
const l2NightFocus  = ref(params.get('l2_night_focus')  || '20')
// The Arabic Layout is drawn Arabic-first, so that is its default.
const l1Lang        = layoutLang('l1_lang', 'ar')
const l2Text    = ref(params.get('l2_text')    || '#FFFFFF')
const l2Accent  = ref(params.get('l2_accent')  || '#22C55E')
const l2Bg      = ref(params.get('l2_bg')      || '#0F172A')
const l2Surface = ref(params.get('l2_surface') || '#111827')
const l2MutedText     = ref(params.get('l2_muted_text')     || '#94a3b8')
const l2SecondaryText = ref(params.get('l2_secondary_text') || '#e2e8f0')
const l2SubtleText    = ref(params.get('l2_subtle_text')    || '#64748b')
const l2HighlightText = ref(params.get('l2_highlight_text') || '#fbbf24')
const l2AdhanScale  = ref(params.get('l2_adhan_scale')  || '1')
const l2IqamahScale = ref(params.get('l2_iqamah_scale') || '1')
const l2LogoWidth   = ref(withSupportedUnits(params.get('l2_logo_width')) || clampCqi('59px', 9.1, '85px'))
const l2Lang        = layoutLang('l2_lang')

// Layout7 (Bronze grid) — colors + per-element font-size scales.
const l7Text          = ref(params.get('l7_text')           || '#EAEAEA')
const l7Accent        = ref(params.get('l7_accent')         || '#CD7F32')
const l7Bg            = ref(params.get('l7_bg')             || '#0F0F1A')
const l7Surface       = ref(params.get('l7_surface')        || '#111111')
const l7AdhanScale    = ref(params.get('l7_adhan_scale')    || '1')
const l7IqamahScale   = ref(params.get('l7_iqamah_scale')   || '1')
const l7CountdownScale = ref(params.get('l7_countdown_scale') || '1')
const l7LogoWidth     = ref(withSupportedUnits(params.get('l7_logo_width')) || clampCqi('88px', 13.5, '130px'))
const l7NightFocus    = ref(params.get('l7_night_focus')    || '20')
const l7Lang          = layoutLang('l7_lang')
const normalizeScale = value => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0.5 && n <= 2 ? String(value) : null
}

// Layout3 (Classic Islamic Cards) and Layout4 (Modern Circular Grid) colors.
const l3Text    = ref(params.get('l3_text')    || '#543D24')
const l3Accent  = ref(params.get('l3_accent')  || '#C2A67F')
const l3Bg      = ref(params.get('l3_bg')      || '#FFFDF9')
const l3Surface = ref(params.get('l3_surface') || '#FBF5E8')
const l3AdhanScale  = ref(params.get('l3_adhan_scale')  || '1')
const l3IqamahScale = ref(params.get('l3_iqamah_scale') || '1')
const l3LogoWidth   = ref(withSupportedUnits(params.get('l3_logo_width')) || clampCqi('59px', 9.1, '85px'))
const l3Lang        = layoutLang('l3_lang')
const l3NightFocus  = ref(params.get('l3_night_focus') || '20')
const l4Text    = ref(params.get('l4_text')    || '#EDE8DC')
const l4Accent  = ref(params.get('l4_accent')  || '#C2A67F')
const l4Bg      = ref(params.get('l4_bg')      || '#1A1208')
const l4Surface = ref(params.get('l4_surface') || '#221508')
const l4AdhanScale  = ref(params.get('l4_adhan_scale')  || '1')
const l4IqamahScale = ref(params.get('l4_iqamah_scale') || '1')
const l4LogoWidth   = ref(withSupportedUnits(params.get('l4_logo_width')) || clampCqi('59px', 9.1, '85px'))
const l4NightFocus  = ref(params.get('l4_night_focus')  || '20')
const l4Lang        = layoutLang('l4_lang')

// Background photo, now offered by every layout. The colour-only layouts draw it
// through PhotoBackdrop (layouts 1-4, 7); the gallery (layout 10) pins it in place
// of its rotating photos. Layouts 5, 8, 9 and 11 keep their own older bg_image refs.
const photoRef = prefix => reactive({
  image:  imageParamOrDefault(prefix + '_bg_image', ''),
  repeat: params.get(prefix + '_bg_repeat') || 'false',
})
// Focus-screen scrim, per layout: the color and how far it covers the board. The
// night palette is unaffected — each layout keeps its dark focus ground in dark mode.
const focusRef = (prefix, defaultOpacity) => reactive({
  bg:      params.get(prefix + '_focus_bg')      || '#000000',
  opacity: params.get(prefix + '_focus_opacity') || defaultOpacity,
  photo:   params.get(prefix + '_focus_photo')   || 'off',
  // Pure-black ground for OLED panels, and a night dimmer (0.3-1) for the content.
  oled:    params.get(prefix + '_focus_oled')    || 'off',
  // 'analog' = the dial on the leading edge; 'digital' = the corner readout.
  clock:   params.get(prefix + '_focus_clock')   || 'analog',
  dim:     params.get(prefix + '_focus_dim')     || '1',
})
const l1Focus  = focusRef('l1',  '0.92')
const l2Focus  = focusRef('l2',  '0.92')
const l3Focus  = focusRef('l3',  '0.88')
const l4Focus  = focusRef('l4',  '0.92')
const l7Focus  = focusRef('l7',  '0.92')
const l9Focus  = focusRef('l9',  '0.94')
const l10Focus = focusRef('l10', '0.88')
const texFocus = focusRef('tex', '0.88')

const l1Photo  = photoRef('l1')
const l2Photo  = photoRef('l2')
const l3Photo  = photoRef('l3')
const l4Photo  = photoRef('l4')
const l7Photo  = photoRef('l7')
const l10Photo = photoRef('l10')

const LS_URL  = 'prayer_dash_mosque_url'
const LS_NAME = 'prayer_dash_mosque_name'
const LS_ID   = 'prayer_dash_mosque_id'
const mosqueUrl  = ref(params.get('mosque') || localStorage.getItem(LS_URL)  || '')
const mosqueId   = ref(params.get('mid')    || localStorage.getItem(LS_ID)   || '')

// Offline-first cache of the full fetched prayer-data document, keyed by mosque URL, so the
// dashboard can paint last-known times instantly on launch and then revalidate in the background.
// Caching the whole document (not just today) keeps it working offline across midnight rollovers.
const CACHE_KEY_PREFIX = 'prayer_dash_data_cache::'
const cacheKeyFor = (url) => CACHE_KEY_PREFIX + url

function readDataCache(url) {
  if (!url) return null
  try {
    const raw = localStorage.getItem(cacheKeyFor(url))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && parsed.data ? parsed : null
  } catch (_) {
    return null
  }
}

function writeDataCache(url, data) {
  if (!url) return
  try {
    // Prune other mosques' caches so localStorage doesn't accumulate stale entries.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(CACHE_KEY_PREFIX) && k !== cacheKeyFor(url)) localStorage.removeItem(k)
    }
    localStorage.setItem(cacheKeyFor(url), JSON.stringify({ version: 1, fetchedAt: Date.now(), data }))
  } catch (_) {
    // Quota/private-mode failures must never break the dashboard.
  }
}

// Support for mosques without scraped data (direct search in TV app)
const calcLat = parseFloat(params.get('lat') || '0') || null
const calcLng = parseFloat(params.get('lng') || '0') || null
const calcMethod = params.get('calc_method') || 'MWL'
const isCalculatedMosque = !!(calcLat && calcLng)

const DEFAULT_MOSQUE_URL = 'https://getathan.com/api/prayers.php?id=E5Av2wAX' // alnoor
const isSetupMode = params.get('setup') === 'true'
const isNativeSetupMode = params.get('native_setup') === 'true'
const showSearch  = ref(!isNativeSetupMode && (isSetupMode || !mosqueUrl.value))

const quietHoursEnabled = params.get('quiet_hours') === 'true'
const quietFrom         = params.get('quiet_from') || '22:00'
const quietTo           = params.get('quiet_to')   || '05:00'

const prayerTriggers = {
  // mode: off | azaan | iqamah | both.
  //   offset      - minutes BEFORE iqamah (used by 'iqamah' and 'both')
  //   azaanOffset - minutes AFTER the adhan time (used by 'azaan' and 'both')
  fajr:    { mode: params.get('fajr_trigger')    || 'azaan', offset: parseInt(params.get('fajr_offset')    || '10'), azaanOffset: parseInt(params.get('fajr_azaan_offset')    || '0') },
  dhuhr:   { mode: params.get('dhuhr_trigger')   || 'azaan', offset: parseInt(params.get('dhuhr_offset')   || '10'), azaanOffset: parseInt(params.get('dhuhr_azaan_offset')   || '0') },
  asr:     { mode: params.get('asr_trigger')     || 'azaan', offset: parseInt(params.get('asr_offset')     || '10'), azaanOffset: parseInt(params.get('asr_azaan_offset')     || '0') },
  maghrib: { mode: params.get('maghrib_trigger') || 'azaan', offset: parseInt(params.get('maghrib_offset') || '10'), azaanOffset: parseInt(params.get('maghrib_azaan_offset') || '0') },
  isha:    { mode: params.get('isha_trigger')    || 'azaan', offset: parseInt(params.get('isha_offset')    || '10'), azaanOffset: parseInt(params.get('isha_azaan_offset')    || '0') },
}
const prayerAlertsEnabled = params.get('prayer_alerts') !== 'false'

const prayerData         = ref(null)
const tomorrowPrayerData = ref(null)
const bgMap         = ref({})
const adhanMap      = ref({})
const mosqueName    = ref(params.get('name') || localStorage.getItem(LS_NAME) || '')
const MCA_IDS   = ['E5Av2wAX', 'vOLn92KM']
const MCA_NAMES = ['MCA', 'Masjid Al-Noor (MCA)', 'Muslim Community Association']
const isMcaMosque = computed(() =>
  MCA_IDS.includes(mosqueId.value) || MCA_NAMES.includes(mosqueName.value)
)
const mosqueLogoSrc = computed(() => l5LogoUrl.value.trim() || (isMcaMosque.value ? mcaLogoPng : ''))
const logoWidthRefByLayout = {
  'layout-1': l1LogoWidth,
  'layout-2': l2LogoWidth,
  'layout-3': l3LogoWidth,
  'layout-4': l4LogoWidth,
  'layout-5': l5LogoWidth,
  'layout-7': l7LogoWidth,
  'layout-8': texLogoWidth,
  'layout-10': l10LogoWidth,
}
const activeLogoWidthRef = computed(() => logoWidthRefByLayout[bgParam] || l5LogoWidth)
const activeMosqueLogoWidth = computed(() => activeLogoWidthRef.value.value)
const activeMosqueLogoVisible = computed(() => activeMosqueLogoWidth.value !== 'none')
const radioName     = ref('')
const isRadioPlaying = ref(false)
// Status line, shown by the layouts that have a slot for it. Keyed rather than
// literal so it can be re-rendered when the language changes.
const STATUS_TEXT = {
  en: {
    waiting: 'Waiting for data...', selectMosque: 'Select a mosque to continue',
    offline: 'Offline • showing saved times', saved: 'Showing saved times…',
    updated: t => `Updated: ${t}`, calculated: m => `Calculated (${m})`,
    settingsError: m => `Settings error: ${m}`, fetchError: m => `Fetch error: ${m}`,
  },
  ar: {
    waiting: 'في انتظار البيانات...', selectMosque: 'اختر مسجداً للمتابعة',
    offline: 'غير متصل • عرض الأوقات المحفوظة', saved: 'عرض الأوقات المحفوظة…',
    updated: t => `آخر تحديث: ${t}`, calculated: m => `محسوبة (${m})`,
    settingsError: m => `خطأ في الإعدادات: ${m}`, fetchError: m => `خطأ في التحميل: ${m}`,
  },
}
// [key, ...args] — resolved against the active language at render time.
const statusKey = ref(['waiting'])
const statusLang = computed(() => (mainLang.value === 'ar' ? 'ar' : 'en'))
const status = computed(() => {
  const [key, ...args] = statusKey.value
  const entry = STATUS_TEXT[statusLang.value][key]
  return typeof entry === 'function' ? entry(...args) : (entry ?? '')
})
// Debug time travel (?debug=1 only): every derived time on the board reads nowMs, so
// an offset here moves the whole dashboard — next prayer, countdowns, dark mode and all.
const debugMode     = params.get('debug') === '1'
debugEnabled.value  = debugMode      // gates the layouts' debug-only listeners
const debugOffsetMs = ref(0)
const nowMs         = ref(Date.now())

const adhanAudioEl  = ref(null)
const radioAudioEl  = ref(null)
const isAthanPlaying = ref(false)
const isAthanMuted   = ref(false)
const athanIconSrc   = 'https://raw.githubusercontent.com/ahmednabulsi/weekly-scraper/refs/heads/main/prayer-times/assets/athan-audio-icon.png'

function toggleAthanMute() {
  const audio = adhanAudioEl.value
  if (!audio) return
  isAthanMuted.value = !isAthanMuted.value
  audio.muted = isAthanMuted.value
  isAthanMuted.value ? trackAthanMuted() : trackAthanUnmuted()
}

let hlsInstance    = null
let audioContext   = null
let lastFiredKey   = null
let clockInterval  = null
let athanFinishTimer = null
// Radio state captured when the adhan started, so stopping it early can hand the
// stream back exactly like a natural finish does.
let athanResume = null

/** Cut the adhan short — the Prayer Frame emits this when a swipe dismisses its
 *  adhan screen. Mute only silences it; this actually ends playback. */
function stopAthan() {
  if (!isAthanPlaying.value) return
  finishAthanPlayback(athanResume || {})
}

function clearAthanFinishTimer() {
  if (athanFinishTimer) {
    clearInterval(athanFinishTimer)
    athanFinishTimer = null
  }
}

function finishAthanPlayback({ radioWasPlaying = false, radio = null } = {}) {
  clearAthanFinishTimer()
  athanResume = null
  isAthanPlaying.value = false
  isAthanMuted.value = false
  const audio = adhanAudioEl.value
  if (audio) {
    audio.muted = false
    audio.pause()
    try { audio.currentTime = 0 } catch (_) {}
    audio.volume = 1
  }
  if (radioWasPlaying) radio?.play().catch(() => {})
}

function resetAthanPosition(audio) {
  return new Promise(resolve => {
    let settled = false
    let fallbackTimer = null
    const apply = () => {
      if (settled) return
      settled = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      audio.removeEventListener('loadedmetadata', apply)
      try { audio.currentTime = 0 } catch (_) {}
      resolve()
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      apply()
      return
    }

    audio.addEventListener('loadedmetadata', apply, { once: true })
    fallbackTimer = setTimeout(apply, 500)
  })
}

async function prepareAthanPlayback(audio, src) {
  audio.pause()
  audio.removeAttribute('muted')
  audio.muted = false
  audio.volume = 1

  if (src) {
    const nextSrc = new URL(src, window.location.href).href
    if (audio.currentSrc !== nextSrc && audio.src !== nextSrc) {
      audio.src = src
      audio.load()
    }
  }

  await resetAthanPosition(audio)
}

function fadeInAudio(audio, duration = 3000) {
  audio.volume = 0
  return audio.play().then(() => {
    const steps    = 30
    const interval = duration / steps
    let step       = 0
    const timer = setInterval(() => {
      step++
      audio.volume = Math.min(1, step / steps)
      if (step >= steps) clearInterval(timer)
    }, interval)
  })
}

const PRAYER_KEYS = [
  { key: 'fajr',    isFajr: true,  isDhuhr: false },
  { key: 'dhuhr',   isFajr: false, isDhuhr: true  },
  { key: 'asr',     isFajr: false, isDhuhr: false },
  { key: 'maghrib', isFajr: false, isDhuhr: false },
  { key: 'isha',    isFajr: false, isDhuhr: false },
]

const isLayoutMode = computed(() => bgParam.startsWith('layout-'))

/** Layouts that render their own mute control, so the shared overlay stays out of the way. */
const LAYOUTS_WITH_OWN_MUTE = ['layout-3', 'layout-11']
// Layout 3 draws its own athan takeover but has no countdown; the Prayer Frame
// draws both. Everything else takes both from the shared overlay.
const OWN_ATHAN_SCREEN     = ['layout-3', 'layout-11']
const OWN_COUNTDOWN_SCREEN = ['layout-11']
const interruptScreens = computed(() => [
  ...(OWN_COUNTDOWN_SCREEN.includes(bgParam) ? [] : ['countdown']),
  ...(OWN_ATHAN_SCREEN.includes(bgParam)     ? [] : ['athan']),
])
const showPrayerInterrupt = computed(() => interruptScreens.value.length > 0)
/** The overlay follows the active layout's language. */
const interruptLang = computed(() => ({
  'layout-1':  l1Lang.value,
  'layout-2':  l2Lang.value,
  'layout-3':  l3Lang.value,
  'layout-4':  l4Lang.value,
  'layout-5':  l5Lang.value,
  'layout-7':  l7Lang.value,
  'layout-8':  texLang.value,
  'layout-9':  l9Lang.value,
  'layout-10': l10Lang.value,
}[bgParam] || mainLang.value))
/** The active layout's accent, so the overlay reads as part of it. */
const interruptAccent = computed(() => ({
  'layout-1':  l1Accent.value,
  'layout-2':  l2Accent.value,
  'layout-3':  l3Accent.value,
  'layout-4':  l4Accent.value,
  'layout-5':  l5Accent.value,
  'layout-7':  l7Accent.value,
  'layout-8':  primaryColor.value,
  'layout-9':  l9AccentColor.value,
  'layout-10': l10AccentColor.value,
}[bgParam] || '#E8A020'))

/**
 * The running layout's ground and ink for the full-screen slides, so the events
 * and Jumu'ah screens stop painting their own dark blue-grey over a light board.
 * The photo-backed layouts (Photo Sidebar, Wide Schedule, Prayer Frame) have no
 * flat ground to borrow, so they pass nothing and the slides keep their dark one.
 */
const interruptBg = computed(() => {
  const grounds = {
    'layout-1':  [l1Bg.value,  l1Surface.value],
    'layout-3':  [l3Bg.value,  l3Surface.value],
    'layout-4':  [l4Bg.value,  l4Surface.value],
    'layout-5':  [l5Bg.value],
    'layout-7':  [l7Bg.value,  l7Surface.value],
    'layout-10': [l10PanelColor.value, l10SurfaceColor.value],
  }[bgParam] || []
  // Setting a background photo clears the layout's ground to #00000000, and a slide
  // that borrowed it drew its text straight over the board with nothing behind it.
  // Fall back to the layout's surface, then to the slides' own dark ground.
  return grounds.find(isOpaqueColor) || ''
})
const interruptText = computed(() => ({
  'layout-1':  l1Text.value,
  'layout-3':  l3Text.value,
  'layout-4':  l4Text.value,
  'layout-5':  l5Text.value,
  'layout-7':  l7Text.value,
  'layout-10': l10PrimaryColor.value,
}[bgParam] || ''))

// ── Friday Jumu'ah ──────────────────────────────────────────────────────────
// Sessions + khateebs for the Friday slide. Empty for a mosque the scraper feed
// does not cover, which is what keeps the slide out of the rotation.
const jumuahPrayers = ref([])
async function refreshJumuah() {
  jumuahPrayers.value = await loadJumuahPrayers({
    mosqueId:   mosqueId.value,
    mosqueUrl:  mosqueUrl.value,
    mosqueName: mosqueName.value,
  })
}
const isFriday = computed(() => new Date(nowMs.value).getDay() === 5)
/** What the layouts get: the sessions on Friday, nothing on the other six days. */
const fridayJumuah = computed(() => (isFriday.value ? jumuahPrayers.value : []))

// ── Masjid events ───────────────────────────────────────────────────────────
const allEvents = ref([])

/** Venue-filtered, so an Al-Noor screen can show only its own events. */
const scopedEvents = computed(() => filterByVenue(allEvents.value, eventsVenue.value))

async function refreshEvents() {
  const id = resolveMosqueId(mosqueId.value, mosqueUrl.value)
  if (!id) { allEvents.value = []; return }
  const { events } = await loadEvents(id)
  allEvents.value = events
}

/** On Friday the Dhuhr slot is a Jumu'ah session: the board counts down to the
 *  khutbah, and says so, rather than calling it an iqamah. */
const nextJumuahSession = computed(() => {
  if (!isFriday.value || nextPrayerKey.value !== 'dhuhr') return null
  const list = fridayJumuah.value
  if (!list.length) return null
  const now = new Date(nowMs.value)
  const i = nextJumuahIndex(list, now)
  if (i < 0) return null
  const at = jumuahDate(list[i].time, now)
  return at >= now ? { session: list[i], at } : null
})

/** Seconds until the next iqamah, for the after-athan screen's clock. */
const secondsToIqamah = computed(() => {
  const jumuah = nextJumuahSession.value
  if (jumuah) return Math.max(0, Math.round((jumuah.at.getTime() - nowMs.value) / 1000))
  const key = nextPrayerKey.value
  if (!key || !activePrayerData.value) return null
  const p = PRAYER_KEYS.find(x => x.key === key)
  if (!p) return null
  const t = getPrayerDateTime(activePrayerData.value[key + '_iqamah'], p.isFajr, p.isDhuhr, activePrayerBaseDate.value)
  if (!t) return null
  return Math.max(0, Math.round((t.getTime() - nowMs.value) / 1000))
})

/** "1st Jummah starts in" — replaces the events screen's "Iqamah in" kicker. */
const iqamahCountdownLabel = computed(() => {
  const jumuah = nextJumuahSession.value
  if (!jumuah) return ''
  const name = jumuahName(jumuah.session, {
    lang: interruptLang.value,
    index: fridayJumuah.value.indexOf(jumuah.session),
    count: fridayJumuah.value.length,
    label: interruptLang.value === 'ar' ? 'الجمعة' : "Jumu'ah",
  })
  return interruptLang.value === 'ar' ? `تبدأ ${name} بعد` : `${name} starts in`
})

/** The athan that most recently passed, and how long ago. */
const sinceLastAthanSec = computed(() => {
  if (!activePrayerData.value) return null
  const now = new Date(nowMs.value)
  let best = null
  for (const { key, isFajr, isDhuhr } of PRAYER_KEYS) {
    const t = getPrayerDateTime(activePrayerData.value[key + '_azaan'], isFajr, isDhuhr, activePrayerBaseDate.value)
    if (t && t <= now && (!best || t > best)) best = t
  }
  return best ? Math.round((now - best) / 1000) : null
})

const eventsTodayLeft = computed(() => remainingToday(scopedEvents.value, new Date(nowMs.value)))
const eventsThisWeek  = computed(() => upcoming(scopedEvents.value, new Date(nowMs.value), 7))

/**
 * The after-athan window: from the moment the athan screen steps aside until N
 * minutes later, and only while the iqamah is still ahead and there is actually
 * something left to show. The iqamah countdown rides along on that screen, because
 * this is exactly when people want it.
 */
const AFTER_ATHAN_START_SEC = 180   // let the athan screen have its moment first
/** Which athan opened the current window — a minute stamp, so the next athan
 *  gets its own id and any dismissal from the last one falls away. */
const afterAthanWindowId = computed(() => {
  const since = sinceLastAthanSec.value
  return since == null ? '' : String(Math.round((nowMs.value - since * 1000) / 60000))
})
/** Set by a swipe on the countdown screen; cleared by a swipe on the board. */
const afterAthanDismissedId = ref('')

const afterAthanAvailable = computed(() => {
  const mins = Number(eventsAfterAthan.value)
  if (!Number.isFinite(mins) || mins <= 0) return false
  const since = sinceLastAthanSec.value
  if (since == null || since < AFTER_ATHAN_START_SEC || since > mins * 60) return false
  if (secondsToIqamah.value == null || secondsToIqamah.value <= 30) return false
  return eventsTodayLeft.value.length > 0
})
/**
 * The after-athan screen is an interruption rather than a rotation slot, but it still
 * waits for the board's current dwell to run out before taking the screen — showing it
 * two seconds into a schedule or focus card is exactly the flash this clock exists to
 * stop. With no alternation at all (`focus_interval=0`) there is no dwell to wait for.
 */
const afterAthanArmedId = ref('')
watch(slotTick, () => {
  if (afterAthanAvailable.value) afterAthanArmedId.value = afterAthanWindowId.value
})
const afterAthanActive = computed(() =>
  afterAthanAvailable.value &&
  afterAthanDismissedId.value !== afterAthanWindowId.value &&
  (focusIntervalSec.value <= 0 || afterAthanArmedId.value === afterAthanWindowId.value)
)

/**
 * The all-night focus window — Isha iqamah + N minutes until Fajr adhan — during
 * which a layout pins itself to the Fajr focus screen and stops alternating.
 *
 * Mirrors the layouts' own `nightFocusActive`, including anchoring to *today's* Isha
 * iqamah rather than the active slice, which has already rolled over to tomorrow by
 * then. Each layout carries its own setting, and a few have none at all.
 */
const nightFocusSetting = computed(() => ({
  'layout-1':  l1NightFocus.value,
  'layout-3':  l3NightFocus.value,
  'layout-4':  l4NightFocus.value,
  'layout-7':  l7NightFocus.value,
  'layout-8':  texNightFocus.value,
  'layout-9':  l9NightFocus.value,
  'layout-10': l10NightFocus.value,
  'layout-11': l11NightAfterIsha.value,
}[bgParam] ?? 'off'))

const nightFocusActive = computed(() => {
  const setting = String(nightFocusSetting.value ?? 'off')
  if (setting === 'off' || !activePrayerData.value) return false
  const minutes = Number(setting)
  if (!Number.isFinite(minutes)) return false
  const today = prayerData.value || activePrayerData.value
  const base = new Date(nowMs.value)
  const ishaIqamah = today?.isha_iqamah
    ? getPrayerDateTime(today.isha_iqamah, false, false, base) : null
  const fajrAdhan = activePrayerData.value?.fajr_azaan
    ? getPrayerDateTime(activePrayerData.value.fajr_azaan, true, false, base) : null
  if (!ishaIqamah || !fajrAdhan) return false
  const start = new Date(ishaIqamah.getTime() + minutes * 60000)
  return base >= start || base < fajrAdhan          // overnight window
})

// The slides take one slot in three of the board's rotation, so the schedule and
// focus card still get two out of every three. The slot comes from the shared
// rotation clock in viewRotation.js — the same clock the layout alternates on, so a
// slide can only ever land on a dwell boundary and never cut a screen short.
/** The slot the slides get. Only while the board is actually alternating: all night
 *  it holds the Fajr focus screen, and cutting into that is not a rotation, it is
 *  an interruption. */
const slideSlotDue = computed(() =>
  focusIntervalSec.value > 0 &&
  !nightFocusActive.value &&
  rotationSlideDue.value
)

const eventsAvailable = computed(() => eventsCard.value !== 'off' && eventsThisWeek.value.length > 0)
/** Once Asr is in, Jumu'ah is over for the week: the slide drops out of the
 *  rotation for the rest of the day (the schedule still lists the day's sessions). */
const jumuahAvailable = computed(() => {
  if (!isFriday.value || jumuahPrayers.value.length === 0) return false
  const asr = activePrayerData.value
    ? getPrayerDateTime(activePrayerData.value.asr_azaan, false, false, activePrayerBaseDate.value)
    : null
  return !asr || nowMs.value < asr.getTime()
})

/** On Friday the Jumu'ah slide shares the slot with the week card, alternating so
 *  neither one disappears on a mosque that has both. */
const jumuahCardActive = computed(() =>
  slideSlotDue.value && jumuahAvailable.value &&
  (!eventsAvailable.value || slideTurn.value % 2 === 0)
)
const weekCardActive = computed(() =>
  slideSlotDue.value && eventsAvailable.value && !jumuahCardActive.value
)

/** Manual peek from the native events button; auto-expires. */
const manualEventsUntil = ref(0)
const manualEventsActive = computed(() =>
  manualEventsUntil.value > 0 && nowMs.value < manualEventsUntil.value
)
function showEventsNow(seconds = 60) {
  // 'Events Card: Off' means off everywhere, the native events button included —
  // otherwise a board that opted out of the card could still be made to show one.
  // 'off' rather than false, so the caller can say why nothing happened.
  if (eventsCard.value === 'off') return 'off'
  if (!eventsThisWeek.value.length && !eventsTodayLeft.value.length) return false
  manualEventsUntil.value = Date.now() + seconds * 1000
  return true
}
function dismissEvents() { manualEventsUntil.value = 0 }

/**
 * Whether a countdown or athan screen is up right now — whichever component draws
 * it. Recomputed here rather than reported upward because three different
 * components render those screens and they all follow the same shared rules.
 */
const SILENT_ATHAN_SEC = 90
const interruptShowing = computed(() => {
  if (isAthanPlaying.value) return true
  const since = sinceLastAthanSec.value
  if (since != null && since < SILENT_ATHAN_SEC) return true
  const lead = countdownLeadMs(countdownLead.value)
  if (!lead || !activePrayerData.value) return false
  const resolve = (key, kind) => {
    const p = PRAYER_KEYS.find(x => x.key === key)
    const raw = activePrayerData.value?.[`${key}_${kind}`]
    return raw && p ? getPrayerDateTime(raw, p.isFajr, p.isDhuhr, activePrayerBaseDate.value) : null
  }
  const ev = findNextEvent(resolve, countdownKinds(countdownFor.value), new Date(nowMs.value))
  if (!ev) return false
  const left = ev.at.getTime() - nowMs.value
  return left > 0 && left <= lead
})

// A swipe leaves the events screen early, matching the gesture everywhere else.
const EVENTS_SWIPE_MIN_PX = 60
const EVENTS_SWIPE_MAX_MS = 1500
const eventsSwipeStart = ref(null)
function onEventsPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  eventsSwipeStart.value = { x: e.clientX, y: e.clientY, t: Date.now() }
}
function onEventsPointerUp(e) {
  const start = eventsSwipeStart.value
  eventsSwipeStart.value = null
  if (!start || Date.now() - start.t > EVENTS_SWIPE_MAX_MS) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Math.abs(dx) < EVENTS_SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return
  dismissEvents()
  // The after-athan screen is not part of the rotation, so it needs dismissing
  // on its own — without this a swipe on it did nothing at all.
  if (afterAthanAvailable.value) afterAthanDismissedId.value = afterAthanWindowId.value
  // Hand the rotation back to the board rather than straight onto another slide,
  // and let the board's own view have a full dwell from here.
  skipSlideSlot()
}

/**
 * Swipe on the board itself to bring a dismissed countdown screen back, for as
 * long as its window is still open. Bound on the window in the capture phase so
 * it works on every layout — each one owns its own swipe handling for its focus
 * view, and this must not depend on any of them.
 */
const boardSwipeStart = ref(null)
/** Bumped on a restoring swipe; PrayerInterrupt clears its own dismissal on it. */
const interruptRestoreToken = ref(0)

/** Any full-screen slide on top of the board owns the gesture itself — asked of
 *  the DOM because PrayerInterrupt tracks its own dismissal internally. */
const slideOnTop = () => !!document.querySelector('.ev-root, .ju-root, .pi-root')

function onBoardPointerDown(e) {
  if (slideOnTop()) { boardSwipeStart.value = null; return }
  if (e.pointerType === 'mouse' && e.button !== 0) return
  boardSwipeStart.value = { x: e.clientX, y: e.clientY, t: Date.now() }
}
function onBoardPointerUp(e) {
  const start = boardSwipeStart.value
  boardSwipeStart.value = null
  if (!start || slideOnTop()) return
  if (Date.now() - start.t > EVENTS_SWIPE_MAX_MS) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Math.abs(dx) < EVENTS_SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return

  // Nothing dismissed to bring back: leave the swipe to the layout's focus toggle.
  if (!afterAthanAvailable.value && !interruptShowing.value) return

  afterAthanDismissedId.value = ''
  interruptRestoreToken.value++
  e.stopPropagation()
}

/** Which events face is up. The countdown/athan screens always win. */
const eventsFace = computed(() => {
  if (interruptShowing.value) return ''
  if (manualEventsActive.value) return 'week'
  if (afterAthanActive.value) return 'afterAthan'
  if (weekCardActive.value) return 'week'
  return ''
})
const eventsForFace = computed(() =>
  eventsFace.value === 'afterAthan' ? eventsTodayLeft.value : eventsThisWeek.value
)

/** Same precedence as the events card: countdown, athan and the after-athan window
 *  all win, and a manual events peek does too. */
const jumuahScreenActive = computed(() =>
  !interruptShowing.value &&
  !manualEventsActive.value &&
  !afterAthanActive.value &&
  jumuahCardActive.value
)


// After Isha iqamah, switch to showing tomorrow's prayer times
const isAfterIshaIqamah = computed(() => {
  if (!prayerData.value) return false
  const now = new Date(nowMs.value)
  // Anchor on nowMs, not the wall clock: with the same date on both sides this is the
  // usual comparison, and under debug time travel the whole board stays coherent.
  return now > getPrayerDateTime(prayerData.value['isha_iqamah'], false, false, now)
})

const activePrayerData = computed(() =>
  isAfterIshaIqamah.value && tomorrowPrayerData.value
    ? tomorrowPrayerData.value
    : prayerData.value
)

const activePrayerBaseDate = computed(() => {
  const base = new Date(nowMs.value)
  if (isAfterIshaIqamah.value && tomorrowPrayerData.value) {
    base.setDate(base.getDate() + 1)
  }
  return base
})

// When already showing tomorrow's data, we have no day+2 data for the change-alert
const activeTomorrowData = computed(() =>
  isAfterIshaIqamah.value ? null : tomorrowPrayerData.value
)

const isDarkMode = computed(() => computeDarkMode({
  mode: darkModePref.value,
  prayerData: activePrayerData.value,
  startKey: darkStartKey,
  endKey: darkEndKey,
  startOffset: darkStartOffset,
  endOffset: darkEndOffset,
  now: new Date(nowMs.value),
  baseDate: activePrayerBaseDate.value,
}))

const effectiveBackdropOpacity = computed(() => {
  const base = Number(backdropOpacity.value) || 0
  if (!isDarkMode.value) return String(base)
  return String(Math.min(0.95, base + 0.10))
})

const displayProps = computed(() => ({
  timeFormat:  params.get('time_format') || '12',
  hijriOffset: parseInt(params.get('hijri_offset') || '0', 10),
  showSeconds: boolParam('show_seconds', true),
  showHijri:   boolParam('show_hijri', true),
  showSunrise: boolParam('show_sunrise', true),
  showMosque:  boolParam('show_mosque', true),
  mosqueLogoSrc: activeMosqueLogoVisible.value ? mosqueLogoSrc.value : '',
  mosqueLogoWidth: activeMosqueLogoWidth.value,
  backdropColor:   backdropColor.value,
  backdropOpacity: effectiveBackdropOpacity.value,
  darkMode: isDarkMode.value,
}))

const nextPrayerKey = computed(() => {
  if (!activePrayerData.value) return null
  const now = new Date(nowMs.value)
  const baseDate = activePrayerBaseDate.value

  let nextKey = 'fajr'
  let nextAt = null
  for (const { key, isFajr, isDhuhr } of PRAYER_KEYS) {
    const t = getPrayerDateTime(activePrayerData.value[key + '_iqamah'], isFajr, isDhuhr, baseDate)
    if (t > now) { nextKey = key; nextAt = t; break }
  }

  // A later Jumu'ah session often starts after the feed's Dhuhr iqamah has passed
  // — MCA's 2nd is 1:30 against a 12:15 first — and the board would skip to Asr
  // while the hall is still filling for it. Hold on Dhuhr while a session is
  // genuinely still ahead *and sooner than whatever prayer is otherwise next*:
  // past midnight on a Friday the khutbah is hours away and Fajr is what comes
  // next, so the hold must not reach back over it.
  if (isFriday.value && fridayJumuah.value.length) {
    const ahead = fridayJumuah.value
      .map(s => jumuahDate(s.time, now))
      .filter(t => t > now)
      .sort((a, b) => a - b)[0]
    if (ahead && (!nextAt || ahead < nextAt)) return 'dhuhr'
  }

  return nextKey
})

// ── Debug time travel ───────────────────────────────────────────────────────
// Jump targets come from the live feed, so each button lands on a real transition.
const debugJumps = computed(() => {
  if (!debugMode || !activePrayerData.value) return []
  const base = activePrayerBaseDate.value
  const NAMES = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }
  return PRAYER_KEYS.map(({ key, isFajr, isDhuhr }) => ({
    key,
    name: NAMES[key],
    adhanAt:  getPrayerDateTime(activePrayerData.value[key + '_azaan'],  isFajr, isDhuhr, base).getTime(),
    iqamahAt: getPrayerDateTime(activePrayerData.value[key + '_iqamah'], isFajr, isDhuhr, base).getTime(),
  }))
})
/** Isha iqamah + the layout's night-focus delay + a minute, i.e. the first moment the
 *  all-night focus screen is up. */
const debugNightFocusAt = computed(() => {
  const isha = debugJumps.value.find(j => j.key === 'isha')
  if (!isha) return 0
  const minutes = Number(l3NightFocus.value)
  return isha.iqamahAt + (Number.isFinite(minutes) ? minutes : 20) * 60000 + 60000
})
function setDebugNow(targetMs) {
  setDebugOffset(targetMs - Date.now())
}
function nudgeDebugNow(deltaMs) { setDebugNow(nowMs.value + deltaMs) }
function setDebugOffset(ms) {
  debugOffsetMs.value = ms
  debugClockOffset.value = ms          // every layout's own clock follows this
  nowMs.value = Date.now() + ms
}
function debugToggleView() { window.dispatchEvent(new CustomEvent('tv-debug-toggle-view')) }
function debugToggleAthan() { isAthanPlaying.value = !isAthanPlaying.value }

watchEffect(() => {
  const dark = isDarkMode.value
  document.body.classList.toggle('dark-mode', dark)
  document.body.classList.toggle('light-mode', !dark)
  document.documentElement.style.setProperty('--night-brightness', dark ? String(darkBrightness) : '1')
  document.documentElement.style.setProperty('--night-overlay', dark ? String(1 - darkBrightness) : '0')
})

const SETTINGS_REMOTE_URL = 'https://tv.getathan.com/prayer-dash/tv-settings.json'

// ── Central layout control ───────────────────────────────────────────────────
// Every layout re-reads tv-settings.json a couple of times a day. When the
// configured layout CHANGES the dashboard reloads onto it, so a mosque's screens
// can be re-skinned centrally without touching each device.
//
// Keyed off the change, not off a mismatch: if it compared against the layout
// currently showing, it would also undo a layout somebody picked on the device.
const LAYOUT_OVERRIDE_KEY = 'prayer_dash_layout_override'
const CONFIG_POLL_HOURS = Math.max(1, Number(params.get('config_poll_hours') || 12))
let lastConfigCheckMs = Date.now()

function resolveLayoutOverride(settings) {
  const cfg = settings?.layoutOverride
  if (!cfg) return null
  const byMosque = cfg.byMosque || {}
  return byMosque[mosqueId.value] || byMosque[mosqueUrl.value] || cfg.default || null
}

/** @returns true when it is navigating away, so callers can stop. */
function applyLayoutOverride(settings) {
  const next = resolveLayoutOverride(settings)
  if (!next) return false
  let last = null
  try { last = localStorage.getItem(LAYOUT_OVERRIDE_KEY) } catch (_) {}
  if (next === last) return false           // already seen; don't fight a local choice
  try { localStorage.setItem(LAYOUT_OVERRIDE_KEY, next) } catch (_) {}
  if (next === bgParam) return false        // already showing it
  const url = new URL(window.location.href)
  url.searchParams.set('bg', next)
  window.location.replace(url.toString())   // reload onto the new layout
  return true
}

// ── Picking up a new dashboard build ─────────────────────────────────────────
// A wall display can run for weeks without anything ever reloading the page, so a
// deployed bundle would never reach it: tv.html revalidates on *load*, and nothing
// triggers a load. Bumping `uiVersion` in tv-settings.json makes every screen
// reload itself on its next config poll.
//
// Keyed off the change, like layoutOverride - comparing against anything else
// risks a reload loop on a screen that cannot reach the new bundle.
const UI_VERSION_KEY = 'prayer_dash_ui_version'

function applyUiVersion(settings) {
  const raw = settings?.uiVersion
  if (raw == null || raw === '') return
  const next = String(raw)
  let last = null
  try { last = localStorage.getItem(UI_VERSION_KEY) } catch (_) {}
  try { localStorage.setItem(UI_VERSION_KEY, next) } catch (_) {}
  // First sighting (or storage was cleared): adopt it quietly. Reloading here would
  // mean every screen in the estate reloads the moment the field is introduced.
  if (last === null || last === next) return
  window.location.reload()
}

/** Re-read the config if enough time has passed. Driven by the prayer-data poll
 *  rather than its own long timer, which a suspended WebView would never fire. */
async function maybeCheckRemoteConfig() {
  if (Date.now() - lastConfigCheckMs < CONFIG_POLL_HOURS * 3600 * 1000) return
  lastConfigCheckMs = Date.now()
  try {
    const settings = await loadSettingsJson()
    // Layout first: if it navigates, the reload below would be redundant.
    if (applyLayoutOverride(settings)) return
    applyUiVersion(settings)
  } catch (_) {
    // Offline: try again on the next poll.
  }
}

async function loadSettingsJson() {
  const res = await fetch(SETTINGS_REMOTE_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`)
  return await res.json()
}

async function fetchSettings() {
  try {
    const s = await loadSettingsJson()
    settingsLoaded = true
    const bm = {}, am = {}
    ;(s.backgrounds || []).forEach(b => { bm[b.key] = b })
    ;(s.adhans      || []).forEach(a => { am[a.key] = a })
    bgMap.value    = bm
    adhanMap.value = am
    applyLayoutOverride(s)
    if (!mosqueName.value) {
      const found = (s.mosques || []).find(m => m.url === mosqueUrl.value)
      if (found) mosqueName.value = found.name
    }
    const adhan = am[adhanParam]
    if (adhan && adhanAudioEl.value) {
      adhanAudioEl.value.src = adhan.url
    }
  } catch (e) {
    statusKey.value = ['settingsError', e.message]
  }
}

// ── Recovering from a failed first load ────────────────────────────
//
// A dedicated frame opens the dashboard within seconds of power-on, before Wi-Fi has
// associated, so the first settings + prayer fetch usually fails. The regular poll is
// 15 minutes away, and with no cached times to paint that left the screen showing a
// bare background for the whole stretch. Retry quickly until the first good load, then
// hand back to the normal poll (`online` cuts the wait short when Wi-Fi arrives).
const BOOT_RETRY_MS     = 2000
const BOOT_RETRY_MAX_MS = 30000
let bootRetryMs    = BOOT_RETRY_MS
let bootRetryTimer = null
let settingsLoaded = false

/** True once the screen has everything it needs to render real content. */
function bootDataReady() {
  if (!settingsLoaded) return false
  // No mosque configured yet is a finished state, not a failure: the app shows its picker.
  return !!prayerData.value || isCalculatedMosque || !mosqueUrl.value
}

function scheduleBootRetry(delayMs = bootRetryMs) {
  if (bootRetryTimer || bootDataReady()) return
  bootRetryTimer = setTimeout(async () => {
    bootRetryTimer = null
    if (bootDataReady()) return
    if (!settingsLoaded) await fetchSettings()
    await fetchPrayerData()
    if (bootDataReady()) {
      bootRetryMs = BOOT_RETRY_MS
      return
    }
    // Back off so a long outage is not a tight fetch loop, but stay well inside
    // the 15-minute poll so the frame still recovers on its own.
    bootRetryMs = Math.min(Math.round(bootRetryMs * 1.5), BOOT_RETRY_MAX_MS)
    scheduleBootRetry()
  }, delayMs)
}

async function fetchPrayerData() {
  if (isCalculatedMosque && calcLat && calcLng) {
    // Use lat/lng calculation for mosques without scraped prayer data.
    // This supports direct search/typing inside the TV app.
    const { buildCalculatedPrayerData } = await import('./utils/prayerTime.js')
    const computed = buildCalculatedPrayerData(calcLat, calcLng, new Date(), calcMethod)
    prayerData.value = computed
    tomorrowPrayerData.value = null
    statusKey.value = ['calculated', calcMethod]
    // Optional: set a name if passed
    if (params.get('name')) {
      mosqueName.value = params.get('name') || ''
    }
    return
  }

  if (!mosqueUrl.value) {
    statusKey.value = ['selectMosque']
    return
  }

  try {
    const res = await fetch(mosqueUrl.value, { cache: 'no-cache' })
    const data = await res.json()
    applyPrayerData(data)
    writeDataCache(mosqueUrl.value, data)
    statusKey.value = ['updated', new Date().toLocaleTimeString(statusLang.value === 'ar' ? 'ar-u-nu-latn' : undefined)]
  } catch (e) {
    // Never clear already-rendered (cached) times on a failed refresh — keep them on screen.
    if (prayerData.value) statusKey.value = ['offline']
    else statusKey.value = ['fetchError', e.message]
  }
}

// Slices today's + tomorrow's prayer day out of a full fetched/cached document.
function applyPrayerData(data) {
  const now = new Date()
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
  const monthData = data[monthNames[now.getMonth()]] || data[monthNames[now.getMonth()].toUpperCase()]
  prayerData.value = monthData?.[now.getDate().toString()] || null

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowMonthData = data[monthNames[tomorrow.getMonth()]] || data[monthNames[tomorrow.getMonth()].toUpperCase()]
  tomorrowPrayerData.value = tomorrowMonthData?.[tomorrow.getDate().toString()] || null
}

// Synchronous, instant paint from the offline cache for the current mosque URL (no network).
function loadCachedPrayerData() {
  if (isCalculatedMosque || !mosqueUrl.value) return false
  const cached = readDataCache(mosqueUrl.value)
  if (!cached) return false
  try {
    applyPrayerData(cached.data)
    if (prayerData.value) {
      statusKey.value = ['saved']
      return true
    }
  } catch (_) {}
  return false
}

function startSilentAudio() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') audioContext.resume()
    const osc  = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(20, audioContext.currentTime)
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    osc.connect(gain)
    gain.connect(audioContext.destination)
    osc.start()
  } catch (e) {
    console.warn('Silent keepalive failed:', e)
  }
}

/**
 * True while the clock is inside the configured quiet window.
 *
 * Wraps midnight by design - 22:00 to 05:00 is the normal case - so the comparison is
 * "outside the gap" rather than "between two times" whenever from > to.
 */
function inQuietHours(now) {
  if (!quietHoursEnabled) return false
  const [fh, fm] = quietFrom.split(':').map(Number)
  const [th, tm] = quietTo.split(':').map(Number)
  const mins  = now.getHours() * 60 + now.getMinutes()
  const start = fh * 60 + fm
  const end   = th * 60 + tm
  if (start === end) return false
  return start < end ? (mins >= start && mins < end) : (mins >= start || mins < end)
}

async function checkAlerts() {
  if (!prayerAlertsEnabled) return
  if (!activePrayerData.value) return
  const now = new Date()
  // Silences every prayer inside the window, whatever each one is individually set to.
  if (inQuietHours(now)) return
  for (const { key, isFajr, isDhuhr } of PRAYER_KEYS) {
    const trigger = prayerTriggers[key]
    // 'off' silences this prayer only; the others can still play.
    if (trigger.mode === 'off') continue

    // 'both' gives a prayer two separate moments, each with its own offset, so they
    // are collected as a list rather than resolved to a single time. Each carries its
    // own tag so one firing cannot suppress the other.
    const slots = []
    if (trigger.mode === 'azaan' || trigger.mode === 'both') {
      const azaanTime = getPrayerDateTime(activePrayerData.value[key + '_azaan'], isFajr, isDhuhr)
      slots.push({ tag: 'azaan', at: new Date(azaanTime.getTime() + (trigger.azaanOffset || 0) * 60 * 1000) })
    }
    if (trigger.mode === 'iqamah' || trigger.mode === 'both') {
      const iqamahTime = getPrayerDateTime(activePrayerData.value[key + '_iqamah'], isFajr, isDhuhr)
      slots.push({ tag: 'iqamah', at: new Date(iqamahTime.getTime() - trigger.offset * 60 * 1000) })
    }

    for (const slot of slots) {
    const pTime   = slot.at
    const diff    = pTime.getTime() - now.getTime()
    const fireKey = key + '_' + slot.tag + '_' + pTime.getHours() + pTime.getMinutes()

    if (diff > -3000 && diff < 1000 && lastFiredKey !== fireKey) {
      lastFiredKey = fireKey
      const audio = adhanAudioEl.value
      const radio = radioAudioEl.value
      if (!audio) continue

      const radioWasPlaying = radio && !radio.paused && !!radio.src
      if (radioWasPlaying) radio.pause()

      const fajrAdhan    = adhanMap.value[fajrAdhanParam]
      const defaultAdhan = adhanMap.value[adhanParam]
      const selectedAdhan = isFajr && fajrAdhan ? fajrAdhan : defaultAdhan

      if (audioContext?.state === 'suspended') audioContext.resume()
      await prepareAthanPlayback(audio, selectedAdhan?.url)
      isAthanMuted.value = false
      isAthanPlaying.value = true
      athanResume = { radioWasPlaying, radio }
      trackAthanPlayed({ prayer: key, adhanType: adhanParam })

      const onEnded = () => {
        finishAthanPlayback({ radioWasPlaying, radio })
      }

      audio.addEventListener('ended', onEnded, { once: true })
      clearAthanFinishTimer()
      athanFinishTimer = setInterval(() => {
        if (!isAthanPlaying.value) {
          clearAthanFinishTimer()
          return
        }
        const doneByEventState = audio.ended
        const doneByTime = Number.isFinite(audio.duration) &&
          audio.duration > 0 &&
          audio.currentTime >= audio.duration - 0.25
        if (doneByEventState || doneByTime) {
          audio.removeEventListener('ended', onEnded)
          finishAthanPlayback({ radioWasPlaying, radio })
        }
      }, 500)

      fadeInAudio(audio)
        .catch(() => {
          audio.removeEventListener('ended', onEnded)
          clearAthanFinishTimer()
          audio.load()
          setTimeout(async () => {
            await resetAthanPosition(audio)
            audio.addEventListener('ended', onEnded, { once: true })
            clearAthanFinishTimer()
            athanFinishTimer = setInterval(() => {
              if (!isAthanPlaying.value) {
                clearAthanFinishTimer()
                return
              }
              const doneByEventState = audio.ended
              const doneByTime = Number.isFinite(audio.duration) &&
                audio.duration > 0 &&
                audio.currentTime >= audio.duration - 0.25
              if (doneByEventState || doneByTime) {
                audio.removeEventListener('ended', onEnded)
                finishAthanPlayback({ radioWasPlaying, radio })
              }
            }, 500)
            fadeInAudio(audio)
              .catch(err => {
                console.error('Critical block:', err)
                finishAthanPlayback()
              })
          }, 400)
        })
    }
    }
  }
}

/** Coordinates for the layouts that draw weather — the Prayer Frame and Modern
 *  Tiles. Only those ask for them, so no other layout pays for the directory fetch. */
const wantsWeather = computed(() =>
  (bgParam === 'layout-11' && l11ShowWeather.value) ||
  (bgParam === 'layout-4'  && l4ShowWeather.value) ||
  (bgParam === 'layout-1'  && l1ShowWeather.value)
)
async function refreshMosqueLocation() {
  if (!wantsWeather.value) return
  if (calcLat && calcLng) return          // lat/lng on the URL already win
  const loc = await resolveMosqueLocation({
    mosqueId: mosqueId.value,
    mosqueUrl: mosqueUrl.value,
  })
  mosqueLat.value = loc?.lat ?? null
  mosqueLng.value = loc?.lng ?? null
}

function postNativeAction(action, payload = {}) {
  try {
    if (window.AndroidNative?.postMessage) {
      window.AndroidNative.postMessage(action, JSON.stringify(payload))
      return true
    }
  } catch (_) {}
  return false
}

function onMosqueSelected({ url, name, id }) {
  mosqueUrl.value   = url
  mosqueName.value  = name
  mosqueId.value    = id || ''
  showSearch.value  = false
  localStorage.setItem(LS_URL,  url)
  localStorage.setItem(LS_NAME, name)
  if (id) localStorage.setItem(LS_ID, id)
  else    localStorage.removeItem(LS_ID)
  trackMosqueSelected({ name, id, hasPrayerTimes: true })
  if (!postNativeAction('mosqueSelected', { url, name, id })) {
    try {
      window.MosqueSetup?.onMosqueSelected?.(url, name)
    } catch (_) {}
  }
  // Paint instantly from cache (if this mosque was viewed before), then revalidate in the background.
  loadCachedPrayerData()
  fetchPrayerData()
  refreshMosqueLocation()
}

onMounted(async () => {
  // ── The shared rotation clock ─────────────────────────────────────────────
  // One dwell for every screen (see utils/viewRotation.js): the board's alternation
  // and the slides' slot come off the same timer, so a slide can only arrive once the
  // screen that is up has had its full `focus_interval`. Wired here rather than in
  // setup: these read computeds declared further down the file.
  watch(focusIntervalSec, sec => setRotationInterval(sec), { immediate: true })
  // Without this the board would hold one view for two slots running on a mosque
  // that has nothing to put in the slide slot.
  setSlideReady(() => eventsAvailable.value || jumuahAvailable.value)
  // An athan or countdown takeover, or a manual events peek, is not part of the
  // rotation: freeze the clock while one is up so the board doesn't change underneath
  // it and comes back with a whole dwell of its own.
  watchEffect(() => holdRotation(
    interruptShowing.value || manualEventsActive.value || afterAthanActive.value
  ))
  if (prayerAlertsEnabled) startSilentAudio()
  // Cache-first: paint last-known times immediately so the dashboard never shows a blank/loading
  // gap on launch, then fetch a fresh copy without blocking the UI.
  loadCachedPrayerData()
  await fetchSettings()
  await fetchPrayerData()
  refreshMosqueLocation()
  // Nothing to show yet (cold start with no network): keep trying fast.
  scheduleBootRetry()
  window.addEventListener('online', () => {
    if (bootDataReady()) return
    bootRetryMs = BOOT_RETRY_MS
    clearTimeout(bootRetryTimer)
    bootRetryTimer = null
    scheduleBootRetry(0)
  })
  // Poll so mosque-side time edits reach the TV quickly: every 15 min during the
  // day, hourly overnight (midnight–4am) when nobody is editing or watching.
  function schedulePrayerDataPoll() {
    const hour = new Date().getHours()
    const delayMs = hour < 4 ? 3600000 : 900000
    setTimeout(() => {
      fetchPrayerData()
      maybeCheckRemoteConfig()
      schedulePrayerDataPoll()
    }, delayMs)
  }
  schedulePrayerDataPoll()

  // Re-slice from cache (instant, offline-safe) then revalidate over the network.
  // Exposed on window so the Android wrapper can trigger it from onResume() after
  // TV standby, when suspended JS timers mean the hourly refresh hasn't fired.
  window.refreshPrayerData = () => {
    loadCachedPrayerData()
    fetchPrayerData()
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.refreshPrayerData()
  })

  trackSession({
    layout:        bgParam,
    adhan:         adhanParam,
    mosqueName:    mosqueName.value,
    triggerConfig: { enabled: prayerAlertsEnabled, prayers: prayerTriggers },
  })

  // Day-rollover watcher: applyPrayerData() slices "today" only when a fetch runs,
  // so without this the dashboard keeps showing yesterday past midnight (or after
  // waking from standby) until the next hourly fetch.
  let lastRenderedDay = new Date().getDate()
  clockInterval = setInterval(() => {
    nowMs.value = Date.now() + debugOffsetMs.value
    checkAlerts()
    const day = new Date().getDate()
    if (day !== lastRenderedDay) {
      lastRenderedDay = day
      window.refreshPrayerData()
    }
  }, 1000)

  const notifyRadioState = (state, name = '') => {
    try {
      window.AndroidRadio?.onStateChanged?.(state, name || '')
    } catch (_) {}
  }

  window.playRadio = (url, name) => {
    const radio = radioAudioEl.value
    if (!radio) return
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
    if (Hls.isSupported() && url.includes('.m3u8')) {
      hlsInstance = new Hls({ enableWorker: false })
      hlsInstance.loadSource(url)
      hlsInstance.attachMedia(radio)
      hlsInstance.once(Hls.Events.MANIFEST_PARSED, () => radio.play().catch(() => {}))
    } else {
      radio.src = url
      radio.load()
      radio.play().catch(() => {})
    }
    radioName.value      = name
    isRadioPlaying.value = true
    notifyRadioState('playing', name)
    trackRadioStarted(name)
  }

  window.pauseRadio = () => {
    const radio = radioAudioEl.value
    if (!radio) return
    radio.pause()
    isRadioPlaying.value = false
    notifyRadioState('paused', radioName.value)
  }

  window.resumeRadio = () => {
    const radio = radioAudioEl.value
    if (!radio) return
    radio.play().catch(() => {})
    isRadioPlaying.value = true
    notifyRadioState('playing', radioName.value)
  }

  window.toggleRadio = () => {
    if (isRadioPlaying.value) window.pauseRadio()
    else window.resumeRadio()
  }

  window.stopRadio = () => {
    const radio = radioAudioEl.value
    if (!radio) return
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null }
    radio.pause()
    radio.src = ''
    radioName.value      = ''
    isRadioPlaying.value = false
    notifyRadioState('stopped', '')
    trackRadioStopped()
  }

  // Live color updates for the Islamic Texture layout, driven by the native
  // Android toolbar. Bound reactively in Layout8 via v-bind() — no reload.
  window.setLayoutColors = (svg, sidebar, main, primary, tile, secondary, sidebarTxt, sidebarAcc) => {
    if (svg)        svgColor.value       = svg
    if (sidebar)    sidebarBg.value      = sidebar
    if (main)       mainBg.value         = main
    if (primary)    primaryColor.value   = primary
    if (tile)       tileColor.value      = tile
    if (secondary)  secondaryColor.value = secondary
    if (sidebarTxt) sidebarText.value    = sidebarTxt
    if (sidebarAcc) sidebarAccent.value  = sidebarAcc
  }

  // Live photo-background selection for the Islamic Texture layout (Android toolbar).
  // image = '' restores the SVG texture; repeat = 'true'/'false'.
  window.setL8Background = (image, repeat) => {
    texBgImage.value  = image ?? ''
    if (repeat != null) texBgRepeat.value = String(repeat)
  }
  window.setL8Sizes = (adhanScale, iqamahScale) => {
    if (adhanScale)  texAdhanScale.value  = adhanScale
    if (iqamahScale) texIqamahScale.value = iqamahScale
  }
  // nightFocus is appended, so a toolbar built before it existed still works.
  window.setL8Style = (primary, secondary, svg, sidebar, sidebarTxt, sidebarAcc, main, tile, image, repeat, adhanScale, iqamahScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    window.setLayoutColors?.(svg, sidebar, main, primary, tile, secondary, sidebarTxt, sidebarAcc)
    window.setL8Background?.(image, repeat)
    window.setL8Sizes?.(adhanScale, iqamahScale)
    if (nightFocus) texNightFocus.value = String(nightFocus)
    if (lang === 'en' || lang === 'ar') texLang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyFocusArgs(texFocus, rest)
  }

  // Live Layout 9 (Masidal) colors + background + sizes, driven by the native
  // Android toolbar. Each arg guarded so partial updates are fine.
  // nightFocus is appended, so a toolbar built before it existed still works.
  window.setL9Style = (tile, secondary, accent, circle, mainBg, bgImage, bgRepeat, adhanScale, iqamahScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (tile)        l9TileColor.value      = tile
    if (secondary)   l9SecondaryColor.value = secondary
    if (accent)      l9AccentColor.value    = accent
    if (circle)      l9CircleColor.value    = circle
    if (mainBg)      l9MainBg.value         = mainBg
    if (bgImage != null)   l9BgImage.value  = normalizeLocalAssetPath(bgImage)
    if (bgRepeat != null)  l9BgRepeat.value = String(bgRepeat)
    if (adhanScale)  l9AdhanScale.value     = adhanScale
    if (iqamahScale) l9IqamahScale.value    = iqamahScale
    if (nightFocus)  l9NightFocus.value     = String(nightFocus)
    if (lang === 'en' || lang === 'ar') l9Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyFocusArgs(l9Focus, rest)
  }

  // nightFocus is appended, so a toolbar built before it existed still works.
  window.setL10Style = (primary, secondary, accent, panel, surface, clockScale, arabicScale, listScale, orbScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (primary)   l10PrimaryColor.value   = primary
    if (secondary) l10SecondaryColor.value = secondary
    if (accent)  l10AccentColor.value  = accent
    if (panel)   l10PanelColor.value   = panel
    if (surface) l10SurfaceColor.value = surface
    if (clockScale)  l10ClockScale.value  = clockScale
    if (arabicScale) l10ArabicScale.value = arabicScale
    if (listScale)   l10ListScale.value   = listScale
    if (orbScale)    l10OrbScale.value    = orbScale
    if (nightFocus)  l10NightFocus.value  = String(nightFocus)
    if (lang === 'en' || lang === 'ar') l10Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l10Photo, rest)
    applyFocusArgs(l10Focus, rest)
  }

  // Live Layout 11 (Prayer Frame) style. Each arg guarded so partial updates are fine.
  // countdownFor/countdownLead are appended, so a toolbar built before they
  // existed still works.
  window.setL11Style = (lang, accent, cardStyle, cardOpacity, contrast, bgImage, nightAfterIsha, showWeather, weatherUnit, adhanScale, iqamahScale, countdownForArg, countdownLeadArg, evCard, evAfter) => {
    if (lang === 'en' || lang === 'ar') l11Lang.value = lang
    if (accent)      l11Accent.value      = accent
    if (cardStyle)   l11CardStyle.value   = cardStyle
    if (cardOpacity != null && cardOpacity !== '') l11CardOpacity.value = String(cardOpacity)
    if (contrast != null)  l11Contrast.value = contrast
    if (bgImage != null)   l11BgImage.value  = normalizeLocalAssetPath(bgImage)
    if (nightAfterIsha)    l11NightAfterIsha.value = String(nightAfterIsha)
    if (showWeather != null) l11ShowWeather.value = String(showWeather) !== 'false'
    if (weatherUnit)       l11WeatherUnit.value = weatherUnit
    if (adhanScale)        l11AdhanScale.value  = adhanScale
    if (iqamahScale)       l11IqamahScale.value = iqamahScale
    applyCountdownSettings(countdownForArg, countdownLeadArg)
    applyEventsSettings(evCard, evAfter)
    if (l11ShowWeather.value && mosqueLat.value == null) refreshMosqueLocation()
  }

  /** Native events button (the third control under the gear and palette).
   *  Returns false when there is nothing to show, so the button can stay inert. */
  window.showEvents = (seconds) => showEventsNow(Number(seconds) > 0 ? Number(seconds) : 60)
  window.setEventsOptions = (card, afterAthan, venue) => {
    if (card === 'on' || card === 'off') eventsCard.value = card
    if (afterAthan != null && afterAthan !== '') eventsAfterAthan.value = String(afterAthan)
    if (venue != null) eventsVenue.value = String(venue)
  }

  // Board-level swipe: capture phase so it runs before each layout's own handler
  // and can take the gesture when there is a countdown screen to bring back.
  window.addEventListener('pointerdown', onBoardPointerDown, true)
  window.addEventListener('pointerup', onBoardPointerUp, true)
  window.addEventListener('pointercancel', () => { boardSwipeStart.value = null }, true)

  // Events feed: once now, then on the same slow cadence as the rest of the config.
  refreshEvents()
  setInterval(refreshEvents, 6 * 60 * 60 * 1000)

  // Jumu'ah feed: the scraper fills in khateebs during the week, and a board can
  // be up for months, so re-read it on the same cadence.
  refreshJumuah()
  setInterval(refreshJumuah, 6 * 60 * 60 * 1000)

  watch([mosqueId, mosqueUrl], refreshEvents)
  watch([mosqueId, mosqueUrl, mosqueName], refreshJumuah)

  // Flips every layout at once, including the default view, which has no
  // per-layout language control of its own.
  window.setLang = (value) => {
    if (value !== 'en' && value !== 'ar') return
    mainLang.value = value
    for (const r of [l1Lang, l2Lang, l3Lang, l4Lang, l5Lang, l7Lang, texLang, l9Lang, l10Lang, l11Lang]) {
      r.value = value
    }
  }

  /** Countdown settings, appended to every layout's setL<N>Style. Only one layout
   *  is active at a time, so they all write to the same pair of refs. */
  /** Events options, appended to every layout's setL<N>Style like the countdown. */
  function applyEventsSettings(card, afterAthan) {
    if (card === 'on' || card === 'off') eventsCard.value = card
    if (afterAthan != null && afterAthan !== '') eventsAfterAthan.value = String(afterAthan)
  }

  function applyCountdownSettings(forValue, leadValue) {
    if (['athan', 'iqamah', 'both'].includes(forValue)) countdownFor.value = forValue
    if (leadValue) countdownLead.value = String(leadValue)
  }
  window.setCountdown = applyCountdownSettings

  // Photo + Repeat are the newest controls on every layout's toolbar, so they arrive
  // after the arguments each setter below already names. They are picked out of the
  // trailing args by shape — an image path and a true/false flag — which keeps a
  // toolbar built from an older tv-settings.json (no Photo control at all) working.
  const IMAGE_ARG = /^(?:https?:\/\/|data:|\/|assets\/)|\.(?:jpe?g|png|webp|gif|svg)$/i
  function applyPhotoArgs(photo, args) {
    const values = args.filter(v => v != null).map(v => String(v).trim())
    const image  = values.find(v => IMAGE_ARG.test(v))
    const repeat = values.find(v => v === 'true' || v === 'false')
    if (image) photo.image = normalizeLocalAssetPath(image)
    // No image among the args: only clear a photo when the Repeat flag proves the
    // toolbar does carry the new controls — i.e. 'None (Color BG)' was picked.
    else if (repeat != null) photo.image = ''
    if (repeat != null) photo.repeat = repeat
  }

  // Focus BG + Focus Opacity ride along in the same trailing args: the only hex and
  // the only 0-1 number out there, so they are read by shape like the photo above.
  const OPACITY_ARG = /^(?:0|1|0?\.\d+)$/
  function applyFocusArgs(focus, args) {
    const values = args.filter(v => v != null).map(v => String(v).trim())
    const hex     = values.find(v => /^#[0-9a-f]{3,8}$/i.test(v))
    // Two 0-1 numbers can arrive: the scrim opacity first, then the night dimmer,
    // in the order the layout's controls declare them.
    const fractions = values.filter(v => OPACITY_ARG.test(v))
    const opacity = fractions[0]
    const dim     = fractions[1]
    const photo   = values.find(v => v === 'on' || v === 'off')
    // 'oled' rather than another on/off: these arrive as a bare list, and a second
    // on/off would be indistinguishable from the photo switch above.
    const oled    = values.find(v => v === 'oled' || v === 'slate')
    const clock   = values.find(v => v === 'analog' || v === 'digital')
    if (hex) focus.bg = hex
    if (opacity != null) focus.opacity = opacity
    if (dim != null) focus.dim = dim
    if (photo != null) focus.photo = photo
    if (oled != null) focus.oled = oled
    if (clock != null) focus.clock = clock
  }

  // Focus-view auto-toggle interval (seconds; 0 disables) — set from Android.
  window.setFocusInterval = (sec) => {
    const n = parseInt(sec)
    if (!Number.isNaN(n)) focusIntervalSec.value = n
  }

  window.setBackdrop = (color, opacity) => {
    if (color) backdropColor.value = color
    if (opacity != null) backdropOpacity.value = String(opacity)
  }

  // Live Layout5 (Vertical Board) colors + font sizes, driven by the native
  // toolbar. Each arg guarded so partial updates are fine.
  window.setL5Style = (text, accent, bg, bgImage, ...rest) => {
    // This arg list has grown several times and every older toolbar shape is still
    // parsed below. Rather than thread a new position through all of them, the
    // language is picked out by value — no other control emits 'en' or 'ar'.
    const lang = rest.find(v => v === 'en' || v === 'ar')
    // countdown_for is the only control emitting athan/iqamah/both, so it anchors
    // the three that follow it. Matching those by value would be ambiguous — the
    // lead, the events card and the after-athan window can all be 'off'.
    const cdAt   = rest.findIndex(v => v === 'athan' || v === 'iqamah' || v === 'both')
    const cdFor  = cdAt >= 0 ? rest[cdAt]     : null
    const cdLead = cdAt >= 0 ? rest[cdAt + 1] : null
    const evCard = cdAt >= 0 ? rest[cdAt + 2] : null
    const evAfter = cdAt >= 0 ? rest[cdAt + 3] : null
    let adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, logoUrl, logoWidth, periodStyle, bgRepeat, customBgImage, showCountdown, showChangeAlert, messageAlignment
    if (rest[0] === 'true' || rest[0] === 'false') {
      if (rest.length >= 11 && String(rest[4] || '').startsWith('#')) {
        ;[bgRepeat, customBgImage, activeRowColor, activeRowOpacity, , , logoUrl, adhanSize, iqamahSize, topPadding, rotation] = rest
      } else if (rest.length >= 11) {
        ;[bgRepeat, customBgImage, activeRowColor, activeRowOpacity, logoUrl, logoWidth, periodStyle, adhanSize, iqamahSize, topPadding, rotation, showCountdown, showChangeAlert, messageAlignment] = rest
      } else if (rest.length >= 10) {
        ;[bgRepeat, customBgImage, activeRowColor, activeRowOpacity, logoUrl, logoWidth, adhanSize, iqamahSize, topPadding, rotation] = rest
      } else {
        ;[bgRepeat, customBgImage, activeRowColor, activeRowOpacity, logoUrl, adhanSize, iqamahSize, topPadding, rotation] = rest
      }
    } else if (String(rest[0] || '').startsWith('#')) {
      if (rest[2] && String(rest[2]).startsWith('#')) {
        ;[activeRowColor, activeRowOpacity, , , logoUrl, adhanSize, iqamahSize, topPadding, rotation] = rest
      } else if (rest.length >= 9) {
        ;[activeRowColor, activeRowOpacity, logoUrl, logoWidth, periodStyle, adhanSize, iqamahSize, topPadding, rotation] = rest
      } else if (rest.length >= 8) {
        ;[activeRowColor, activeRowOpacity, logoUrl, logoWidth, adhanSize, iqamahSize, topPadding, rotation] = rest
      } else {
        ;[activeRowColor, activeRowOpacity, logoUrl, adhanSize, iqamahSize, topPadding, rotation] = rest
      }
    } else {
      if (rest.length >= 14 && String(rest[6] || '').startsWith('#')) {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, , , logoUrl, bgRepeat, customBgImage, showCountdown, showChangeAlert, messageAlignment] = rest
      } else if (rest.length >= 14) {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, logoUrl, logoWidth, periodStyle, bgRepeat, customBgImage, showCountdown, showChangeAlert, messageAlignment] = rest
      } else if (rest.length >= 11 && String(rest[6] || '').startsWith('#')) {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, , , logoUrl, bgRepeat, customBgImage] = rest
      } else if (rest.length >= 11) {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, logoUrl, logoWidth, periodStyle, bgRepeat, customBgImage] = rest
      } else if (rest[9] != null) {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, logoUrl, logoWidth, bgRepeat, customBgImage] = rest
      } else {
        ;[adhanSize, iqamahSize, topPadding, rotation, activeRowColor, activeRowOpacity, logoUrl, bgRepeat, customBgImage] = rest
      }
    }
    if (text)       l5Text.value       = text
    if (accent)     l5Accent.value     = accent
    if (bg)         l5Bg.value         = bg
    if (bgImage != null) l5BgImage.value = bgImage
    if (bgRepeat != null) l5BgRepeat.value = String(bgRepeat)
    if (customBgImage != null) l5CustomBgImage.value = customBgImage
    if (adhanSize)  l5AdhanSize.value  = adhanSize
    if (iqamahSize) l5IqamahSize.value = iqamahSize
    if (topPadding) l5TopPadding.value = topPadding
    if (rotation)   l5Rotation.value   = rotation
    if (activeRowColor)     l5ActiveRowColor.value   = activeRowColor
    if (activeRowOpacity)   l5ActiveRowOpacity.value = activeRowOpacity
    if (logoUrl != null)    l5LogoUrl.value          = logoUrl
    if (logoWidth)          l5LogoWidth.value        = logoWidth
    if (periodStyle)        l5PeriodStyle.value      = periodStyle
    if (showCountdown != null)   l5ShowCountdown.value   = String(showCountdown) !== 'false'
    if (showChangeAlert != null) l5ShowChangeAlert.value = String(showChangeAlert) !== 'false'
    if (['left', 'center', 'right'].includes(messageAlignment)) l5MessageAlignment.value = messageAlignment
    if (lang) l5Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
  }

  window.setMosqueLogoWidth = width => {
    if (width) activeLogoWidthRef.value.value = width
  }

  // Live Layout1 (Arabic) / Layout2 colors (Text, Accent, Background, Surface).
  // nightFocus appended, so an older toolbar build still works.
  window.setL1Style = (text, accent, bg, surface, adhanScale, iqamahScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (text)        l1Text.value        = text
    if (accent)      l1Accent.value      = accent
    if (bg)          l1Bg.value          = bg
    if (surface)     l1Surface.value     = surface
    if (adhanScale)  l1AdhanScale.value  = adhanScale
    if (iqamahScale) l1IqamahScale.value = iqamahScale
    if (nightFocus)  l1NightFocus.value  = String(nightFocus)
    if (lang === 'en' || lang === 'ar') l1Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l1Photo, rest)
    applyFocusArgs(l1Focus, rest)
    // 'weather_on'/'weather_off' rather than another on/off, which this bare argument
    // list could not tell apart from the Focus Photo switch.
    const wx = rest.find(v => v === 'weather_on' || v === 'weather_off')
    if (wx) l1ShowWeather.value = wx === 'weather_on'
    const wu = rest.find(v => v === 'f' || v === 'c')
    if (wu) l1WeatherUnit.value = wu
    if (l1ShowWeather.value && mosqueLat.value == null) refreshMosqueLocation()
  }
  window.setL2Style = (text, accent, bg, surface, adhanScale, iqamahScale, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (text)        l2Text.value        = text
    if (accent)      l2Accent.value      = accent
    if (bg)          l2Bg.value          = bg
    if (surface)     l2Surface.value     = surface
    if (adhanScale)  l2AdhanScale.value  = adhanScale
    if (iqamahScale) l2IqamahScale.value = iqamahScale
    if (lang === 'en' || lang === 'ar') l2Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l2Photo, rest)
    applyFocusArgs(l2Focus, rest)
  }
  window.setL2StyleExtended = (text, accent, bg, surface, mutedText, secondaryText, subtleText, highlightText, adhanScale, iqamahScale, ...rest) => {
    window.setL2Style(text, accent, bg, surface, adhanScale, iqamahScale, ...rest)
    if (mutedText)     l2MutedText.value     = mutedText
    if (secondaryText) l2SecondaryText.value = secondaryText
    if (subtleText)    l2SubtleText.value    = subtleText
    if (highlightText) l2HighlightText.value = highlightText
  }

  // Live Layout7 colors + font-size scales (adhan / iqamah / countdown).
  window.setL7Style = (text, accent, bg, surface, adhanScale, iqamahScale, countdownScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (text)           l7Text.value           = text
    if (accent)         l7Accent.value         = accent
    if (bg)             l7Bg.value             = bg
    if (surface)        l7Surface.value        = surface
    if (normalizeScale(adhanScale))     l7AdhanScale.value     = normalizeScale(adhanScale)
    if (normalizeScale(iqamahScale))    l7IqamahScale.value    = normalizeScale(iqamahScale)
    if (normalizeScale(countdownScale)) l7CountdownScale.value = normalizeScale(countdownScale)
    if (nightFocus) l7NightFocus.value = String(nightFocus)
    if (lang === 'en' || lang === 'ar') l7Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l7Photo, rest)
    applyFocusArgs(l7Focus, rest)
  }

  // Live Layout3 / Layout4 colors (Text, Accent, Background, Surface).
  // lang/nightFocus are appended, so a toolbar built before they existed still works.
  window.setL3Style = (text, accent, bg, surface, adhanScale, iqamahScale, lang, nightFocus, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (text)        l3Text.value        = text
    if (accent)      l3Accent.value      = accent
    if (bg)          l3Bg.value          = bg
    if (surface)     l3Surface.value     = surface
    if (adhanScale)  l3AdhanScale.value  = adhanScale
    if (iqamahScale) l3IqamahScale.value = iqamahScale
    if (lang === 'en' || lang === 'ar') l3Lang.value = lang
    if (nightFocus)  l3NightFocus.value  = String(nightFocus)
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l3Photo, rest)
    applyFocusArgs(l3Focus, rest)
  }
  // nightFocus appended, so an older toolbar build still works.
  window.setL4Style = (text, accent, bg, surface, adhanScale, iqamahScale, nightFocus, lang, cdFor, cdLead, evCard, evAfter, ...rest) => {
    if (text)        l4Text.value        = text
    if (accent)      l4Accent.value      = accent
    if (bg)          l4Bg.value          = bg
    if (surface)     l4Surface.value     = surface
    if (adhanScale)  l4AdhanScale.value  = adhanScale
    if (iqamahScale) l4IqamahScale.value = iqamahScale
    if (nightFocus)  l4NightFocus.value  = String(nightFocus)
    if (lang === 'en' || lang === 'ar') l4Lang.value = lang
    applyCountdownSettings(cdFor, cdLead)
    applyEventsSettings(evCard, evAfter)
    applyPhotoArgs(l4Photo, rest)
    applyFocusArgs(l4Focus, rest)
    // Weather: 'weather_on'/'weather_off' rather than another on/off, which would be
    // indistinguishable from the Focus Photo switch in this bare argument list.
    const wx = rest.find(v => v === 'weather_on' || v === 'weather_off')
    if (wx) l4ShowWeather.value = wx === 'weather_on'
    const wu = rest.find(v => v === 'f' || v === 'c')
    if (wu) l4WeatherUnit.value = wu
    if (l4ShowWeather.value && mosqueLat.value == null) refreshMosqueLocation()
  }
})

onUnmounted(() => {
  clearInterval(clockInterval)
  clearAthanFinishTimer()
})
</script>

<style>
.athan-toggle {
  position: fixed;
  top: clamp(14px, 2.5vh, 32px);
  left: clamp(14px, 2.5vw, 32px);
  z-index: 999;
  cursor: pointer;
  width: clamp(48px, 7vh, 80px);
  height: clamp(48px, 7vh, 80px);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.athan-toggle:hover {
  background: rgba(0, 0, 0, 0.65);
}
.athan-toggle img {
  width: 60%;
  height: 60%;
  object-fit: contain;
  transition: opacity 0.2s;
}
.athan-toggle img.muted {
  opacity: 0.35;
  filter: grayscale(1);
}
</style>
