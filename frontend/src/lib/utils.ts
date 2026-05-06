import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function parseTopic(input: string): string {
  try {
    const parsed = JSON.parse(input);
    return parsed.topic ?? "—";
  } catch {
    return "—";
  }
}
