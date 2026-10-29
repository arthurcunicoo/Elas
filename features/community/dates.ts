import { serviceTimeZone } from "../../constants/serviceTimeZone.ts";
export function cityDateParts(iso: string, timeZone = serviceTimeZone) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => p.find(part => part.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
export function cityInstant(date: string, time: string, timeZone = serviceTimeZone) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 10) !== date)
    throw new Error("Escolha uma data e hora válidas.");
  // Probe offsets around the requested date, then require an exact local round trip.
  // This rejects nonexistent/ambiguous DST wall times instead of silently shifting them.
  const matches = new Set<string>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = wall + hours * 3600000;
    const local = cityDateParts(new Date(sample).toISOString(), timeZone);
    const offset = Date.parse(`${local.date}T${local.time}:00Z`) - sample;
    const candidate = new Date(wall - offset).toISOString();
    const back = cityDateParts(candidate, timeZone);
    if (back.date === date && back.time === time) matches.add(candidate);
  }
  if (matches.size !== 1) throw new Error("Esse horário é inexistente ou ambíguo no fuso da cidade. Escolha outro horário.");
  return [...matches][0];
}
