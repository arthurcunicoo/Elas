import { serviceTimeZone } from "../constants/serviceTimeZone.ts";
export function eventSchedule(startsAt: string, fallback = "", timeZone = serviceTimeZone) {
  const date = new Date(startsAt);
  if (!startsAt || !Number.isFinite(date.getTime()))
    return { day: "", month: "", date: fallback, time: "" };
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone }).format(
      date,
    ),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone })
      .format(date)
      .replace(/\./g, "")
      .toUpperCase(),
    date: new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(date),
  };
}
