/** Compact list timestamp; no invalid dates or fabricated activity. */
export function displayTime(value: string, now = Date.now()) {
  const date = new Date(value),
    elapsed = now - date.getTime();
  if (!Number.isFinite(elapsed)) return "";
  if (elapsed < 0) return date.toLocaleDateString("pt-BR");
  if (elapsed < 60_000) return "Agora";
  if (elapsed < 3_600_000) return `Há ${Math.floor(elapsed / 60_000)} min`;
  if (elapsed < 86_400_000) return `Há ${Math.floor(elapsed / 3_600_000)} h`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
