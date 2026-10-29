export type ReportDraft = {
  place: string;
  description: string;
  category: string;
  linkedId: string;
  correctionField: string;
  proposal: string;
};
export const initialReportDraft: ReportDraft = {
  place: "",
  description: "",
  category: "Outro",
  linkedId: "",
  correctionField: "Endereço",
  proposal: "",
};
export function reportPayload(
  draft: ReportDraft,
  options: {
    correction: boolean;
    linkedId?: string;
    attachLocation: boolean;
    location: { latitude: number; longitude: number } | null;
  },
) {
  const local = draft.place.trim();
  if (options.correction && draft.proposal.trim().length < 3)
    throw new Error("Informe o dado correto que você propõe.");
  const detail = options.correction
    ? `Correção cadastral · ${draft.correctionField}\nProposta: ${draft.proposal.trim()}\nObservação: ${draft.description.trim()}`
    : draft.description.trim();
  if (!local || detail.length < 10)
    throw new Error(
      "Informe o local e descreva o que aconteceu em pelo menos 10 caracteres.",
    );
  const point = options.attachLocation ? options.location : null;
  if (
    point &&
    (!Number.isFinite(point.latitude) ||
      !Number.isFinite(point.longitude) ||
      Math.abs(point.latitude) > 90 ||
      Math.abs(point.longitude) > 180)
  )
    throw new Error("Atualize sua localização antes de enviar.");
  return {
    categoria: draft.category,
    local_texto: local,
    descricao: detail,
    ...(options.linkedId ? { lugar_id: options.linkedId } : {}),
    ...(point
      ? {
          latitude: Number(point.latitude.toFixed(3)),
          longitude: Number(point.longitude.toFixed(3)),
        }
      : {}),
  };
}
