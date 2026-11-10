import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

/*
  Vercel Web Analytics.

  Mounted here rather than inside App so it sits outside the router's state
  entirely and cannot re-run with it. The component renders null; all it does
  is inject the script.

  Page views are tracked from pushState automatically — disableAutoTrack
  defaults off — which is what this app does on every navigation, so there is
  no router integration to write and no manual pageview() calls to keep in
  step with the path parser.

  This is NOT the same thing as the PostHog setup in lib/analytics.js, and the
  two answer different questions. PostHog records named product events and
  nothing else, runs in the browser, and is invisible to anyone with a content
  blocker. This counts page views first-party, so the traffic number it gives
  is the honest one. Both are disclosed in section 2 of the privacy policy.
*/
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
