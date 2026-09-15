import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function maskEmail(value?: string | null) {
  if (!value) return "";
  const [local, domain] = value.split("@");
  return domain ? `${local.slice(0, 1)}${"*".repeat(Math.min(4, Math.max(2, local.length - 1)))}@${domain}` : value;
}
export function maskPhone(value?: string | null) {
  if (!value || value.length < 7) return value ?? "";
  return `${value.slice(0, 3)}****${value.slice(-4)}`;
}
export function safeUrl(value?: string | null) {
  if (!value) return undefined;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined; } catch { return undefined; }
}
