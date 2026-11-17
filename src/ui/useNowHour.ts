"use client";

import { useSyncExternalStore } from "react";

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});

const hourNow = () => Number(clock.format(new Date())) % 24;

function subscribe(listener: () => void) {
  const id = setInterval(listener, 60_000);
  return () => clearInterval(id);
}

/** The current hour in Delhi (0 to 23), or null until the page has hydrated. */
export function useNowHour(): number | null {
  return useSyncExternalStore(subscribe, hourNow, () => null);
}
