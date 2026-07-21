"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useUpdateAllocations() {
  return useMutation(api.settings.updateAllocations);
}

export function useUpdateNotificationPreferences() {
  return useMutation(api.settings.updateNotificationPreferences);
}
