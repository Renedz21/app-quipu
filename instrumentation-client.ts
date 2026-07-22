import posthog from "posthog-js";
import { clientEnv } from "@/core/env";

posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  capture_exceptions: true,
  capture_pageview: "history_change",
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-ph-mask]",
  },
  enable_recording_console_log: true,
  capture_performance: true,
  debug: process.env.NODE_ENV === "development"
});
