import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)

export function generateSlug(): string {
  return nanoid()
}

export function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount.toLocaleString()}`
  }
  return `$${amount.toFixed(2)}`
}

export function formatAnnual(monthly: number): string {
  return formatCurrency(monthly * 12)
}
