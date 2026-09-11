import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** '$' + en-US grouped number, e.g. formatMoney(12345) -> '$12,345'. */
export function formatMoney(value: number, opts?: Intl.NumberFormatOptions): string {
  return `$${new Intl.NumberFormat('en-US', opts).format(value)}`
}
