const GA_ID = 'G-B19V7T7PPV'

function gtag(...args) {
  if (typeof window.gtag !== 'function') return
  window.gtag(...args)
}

// Called once on app mount — captures the full session context
export function trackSession({ layout, adhan, mosqueName, triggerConfig }) {
  gtag('event', 'session_start', {
    layout,
    adhan_type:   adhan,
    mosque_name:  mosqueName || 'unknown',
    trigger_mode: JSON.stringify(triggerConfig),
  })
  // Also send the page_view with these params as custom dimensions
  gtag('event', 'page_view', {
    page_title:    `Prayer Dashboard – ${layout}`,
    page_location: window.location.href,
    layout,
    adhan_type:   adhan,
    mosque_name:  mosqueName || 'unknown',
  })
}

// Fired each time the athan audio triggers
export function trackAthanPlayed({ prayer, adhanType }) {
  gtag('event', 'athan_played', {
    prayer_name: prayer,
    adhan_type:  adhanType,
  })
}

// Fired when user taps the icon to mute mid-athan
export function trackAthanMuted() {
  gtag('event', 'athan_muted')
}

// Fired when user taps the icon to unmute
export function trackAthanUnmuted() {
  gtag('event', 'athan_unmuted')
}

// Fired when a user searches for a mosque. Debounce at the call site so we do
// not log every keystroke.
export function trackMosqueSearch({ query, country, resultsCount, supportedResultsCount }) {
  gtag('event', 'mosque_search', {
    search_term: query,
    country: country || 'unknown',
    results_count: resultsCount ?? 0,
    supported_results_count: supportedResultsCount ?? 0,
  })
}

// Fired when user picks a mosque from the search screen
export function trackMosqueSelected(mosque) {
  const payload = typeof mosque === 'string'
    ? { mosque_name: mosque }
    : {
        mosque_name: mosque?.name || 'unknown',
        mosque_id: mosque?.id || 'unknown',
        country: mosque?.country || 'unknown',
        has_prayer_times: mosque?.hasPrayerTimes ?? true,
      }

  gtag('event', 'mosque_selected', payload)
}

// Fired when a user opens the "request this mosque" path for an unsupported mosque
export function trackMosqueRequestOpened(mosque) {
  gtag('event', 'mosque_request_opened', {
    mosque_name: mosque?.name || 'unknown',
    mosque_id: mosque?.id || 'unknown',
    country: mosque?.country || 'unknown',
  })
}

// Fired when radio playback starts
export function trackRadioStarted(stationName) {
  gtag('event', 'radio_started', { station: stationName || 'unknown' })
}

// Fired when radio is stopped
export function trackRadioStopped() {
  gtag('event', 'radio_stopped')
}
