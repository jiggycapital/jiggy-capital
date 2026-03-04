// PostHog initialization for Next.js 16+ (instrumentation-client.ts approach)
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2024-01-01',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
})
