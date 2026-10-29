import { palette, statusText } from "./theme";
export const impactStatus = {
  solicitada: {
    label: "Solicitada",
    plural: "Solicitadas",
    ink: statusText.requested,
    tint: palette.infoTint,
  },
  em_andamento: {
    label: "Em andamento",
    plural: "Em andamento",
    ink: statusText.moderate,
    tint: palette.warningTint,
  },
  concluida: {
    label: "Concluída",
    plural: "Concluídas",
    ink: statusText.safe,
    tint: palette.successTint,
  },
} as const;
export type ImpactStatus = keyof typeof impactStatus;
export function isImpactStatus(value: string): value is ImpactStatus {
  return Object.prototype.hasOwnProperty.call(impactStatus, value);
}
