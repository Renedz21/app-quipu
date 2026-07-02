import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Compose class names with `clsx` semantics and resolve Tailwind conflicts
 * with `tailwind-merge` so the last-applied utility wins (e.g. `px-4` after
 * `px-2` yields `px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
