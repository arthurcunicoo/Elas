import type { Place } from "./places";
import { statusText, ui } from "./theme";
export const communityMoods = [
  "Segura",
  "Moderada",
  "Atenção",
  "Cuidado",
] as const;
export type CommunityMood = (typeof communityMoods)[number];
export type ReviewSummary = {
  classification: Place["status"];
  policyVersion: number;
  method: string;
  total: number;
  minimum: number;
  windowDays: number;
  distribution: Record<CommunityMood, number> | null;
  lastContribution: string | null;
};
export function communityStatus(
  summary?: ReviewSummary | null,
): Place["status"] {
  return summary?.classification ?? "unknown";
}
export function communityPresentation(place: Place) {
  if (place.demonstration)
    return {
      label:
        place.status === "safe"
          ? "Segura · demonstração"
          : "Atenção · demonstração",
      color: place.status === "safe" ? statusText.safe : statusText.attention,
    };
  if (place.reviewsUnavailable)
    return { label: "Percepções indisponíveis agora", color: ui.muted };
  return place.status === "safe"
    ? { label: "Percepções favoráveis", color: statusText.safe }
    : place.status === "attention"
      ? { label: "Percepções de atenção", color: statusText.attention }
      : place.status === "moderate"
        ? { label: "Percepções variadas", color: statusText.requested }
        : { label: "Sem avaliações suficientes", color: ui.muted };
}
export function equalReviewSummary(a?: ReviewSummary, b?: ReviewSummary) {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.classification === b.classification &&
      a.policyVersion === b.policyVersion &&
      a.method === b.method &&
      a.total === b.total &&
      a.minimum === b.minimum &&
      a.windowDays === b.windowDays &&
      a.lastContribution === b.lastContribution &&
      JSON.stringify(a.distribution) === JSON.stringify(b.distribution))
  );
}
