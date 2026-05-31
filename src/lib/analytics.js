import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

export function initAnalytics() {
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
  });
}

export function identifyUser(userId, email) {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, { email });
}

export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export function track(event, properties = {}) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}