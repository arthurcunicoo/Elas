import { communityMoods, communityStatus, type ReviewSummary } from "../constants/community";
import type { Place } from "../constants/places";
import { requireBackend } from "../lib/supabase";
export function parseReviewSummaries(
  data: unknown,
  policy?: unknown,
): Map<string, ReviewSummary> {
  if (!Array.isArray(data)) throw new Error("Resposta de avaliações inválida.");
  const summaries = new Map<string, ReviewSummary>();
  for (const row of data) {
    const item = policy === undefined ? row : { ...row, politica: policy };
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.lugar_id !== "string" ||
      summaries.has(item.lugar_id) ||
      !Number.isSafeInteger(item.total) ||
      item.total < 0 ||
      !Number.isSafeInteger(item.minimo) ||
      item.minimo < 5 ||
      item.minimo > 1000 ||
      !Number.isSafeInteger(item.janela_dias) ||
      item.janela_dias < 1 ||
      item.janela_dias > 730 ||
      !Number.isSafeInteger(item.politica?.versao) ||
      item.politica.versao < 1 ||
      typeof item.politica?.metodo !== "string" ||
      !item.politica.metodo.trim() ||
      item.politica.metodo.length > 2000 ||
      !["unknown", "safe", "attention", "moderate"].includes(
        item.classificacao,
      ) ||
      (item.total < item.minimo
        ? item.classificacao !== "unknown" || item.ultima_contribuicao !== null
        : item.classificacao === "unknown")
    )
      throw new Error("Resposta de avaliações inválida.");
    const distribution = item.distribuicao;
    if (
      item.total < item.minimo
        ? distribution !== null
        : !distribution ||
          communityMoods.some(
            (mood) =>
              !Number.isSafeInteger(distribution[mood]) ||
              distribution[mood] < 0,
          ) ||
          communityMoods.reduce((n, mood) => n + distribution[mood], 0) !==
            item.total
    )
      throw new Error("Distribuição de avaliações inválida.");
    summaries.set(item.lugar_id, {
      classification: item.classificacao,
      policyVersion: item.politica.versao,
      method: item.politica.metodo,
      total: item.total,
      minimum: item.minimo,
      windowDays: item.janela_dias,
      distribution,
      lastContribution:
        typeof item.ultima_contribuicao === "string"
          ? item.ultima_contribuicao
          : null,
    });
  }
  return summaries;
}
export async function hydrateCommunity(
  places: Place[],
  signal?: AbortSignal,
): Promise<Place[]> {
  if (!places.length) return places;
  const ids = [...new Set(places.map((place) => place.id))];
  const summaries = new Map<string, ReviewSummary>();
  // The catalog is capped at 600 retained places. Batch requests remain bounded.
  for (let offset = 0; offset < ids.length; offset += 600) {
    const request = requireBackend().rpc("resumos_avaliacoes", {
      p_lugares: ids.slice(offset, offset + 600),
      p_compacto: true,
    });
    const { data, error } = await (signal
      ? request.abortSignal(signal)
      : request);
    if (error) throw error;
    const response = data as { resumos?: unknown; politica?: unknown } | null;
    if (!response || !response.politica) throw new Error("Política de avaliações indisponível.");
    for (const [id, summary] of parseReviewSummaries(response.resumos, response.politica))
      summaries.set(id, summary);
  }
  return places.map((place) => {
    const reviewSummary = summaries.get(place.id);
    if (!reviewSummary)
      throw new Error("Resumo de avaliações indisponível para este lugar.");
    return {
      ...place,
      reviewSummary,
      reviewsUnavailable: false,
      status: communityStatus(reviewSummary),
    };
  });
}
export function unavailableCommunity(places: Place[]) {
  return places.map((place) => ({
    ...place,
    status: "unknown" as const,
    reviewSummary: undefined,
    reviewsUnavailable: true,
  }));
}
