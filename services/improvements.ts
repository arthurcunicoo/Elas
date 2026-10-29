import { isImpactStatus } from "../constants/impactStatus";
import { cursorPage } from "./pagination";
import { emptyPage, type Cursor } from "../lib/pagination";
import { listDemonstrations, type ShowcaseRow } from "./showcase";
import { supabase } from "../lib/supabase";
import { Database } from "../lib/database.types";

export type ImprovementRow = Pick<
  Database["public"]["Tables"]["solicitacoes_melhoria"]["Row"],
  "id" | "titulo" | "descricao" | "status" | "criado_em"
>;
export type ImpactRow = ImprovementRow & { propria: boolean };
export type ImpactPanel = {
  minhas: {
    rows: ImpactRow[];
    counts: { solicitada: number; em_andamento: number; concluida: number };
  };
  cidade: {
    rows: ImpactRow[];
    counts: { em_andamento: number; concluida: number };
  };
};
export function emptyImpacts(): ImpactPanel {
  return {
    minhas: {
      rows: [],
      counts: { solicitada: 0, em_andamento: 0, concluida: 0 },
    },
    cidade: { rows: [], counts: { em_andamento: 0, concluida: 0 } },
  };
}
export async function listImprovements() {
  if (!supabase) return { ...emptyImpacts(), examples: [] as ShowcaseRow[] };
  const { data, error } = await supabase.rpc("painel_impactos");
  if (error) throw error;
  const result = data as unknown as ImpactPanel;
  for (const scope of ["minhas", "cidade"] as const) {
    const section = result?.[scope];
    const statuses =
      scope === "minhas"
        ? ["solicitada", "em_andamento", "concluida"]
        : ["em_andamento", "concluida"];
    if (
      !section ||
      !Array.isArray(section.rows) ||
      !section.counts ||
      statuses.some((status) => {
        const count = (section.counts as Record<string, number>)[status];
        return !Number.isSafeInteger(count) || count < 0;
      }) ||
      section.rows.some(
        (row) =>
          !isImpactStatus(row.status) ||
          typeof row.propria !== "boolean" ||
          (scope === "minhas" ? !row.propria : row.status === "solicitada"),
      )
    )
      throw new Error("Resumo de impactos inválido.");
  }
  return {
    ...result,
    examples:
      result.minhas.rows.length || result.cidade.rows.length
        ? []
        : await listDemonstrations("impacto"),
  };
}
export async function createImprovement(
  requestId: string,
  title: string,
  description: string,
  placeId?: string,
) {
  if (!supabase) throw new Error("Conexão com o banco indisponível.");
  const { data, error } = await supabase.rpc("enviar_registro", {
    p_tipo: "melhoria",
    p_chave: requestId,
    p_dados: {
      titulo: title,
      descricao: description,
      ...(placeId ? { lugar_id: placeId } : {}),
    },
  });
  if (error) throw error;
  return data;
}

type ImprovementHistoryRow = ImprovementRow & { lugar_id: string | null };
export const improvementHistory = (cursor: Cursor | null, status: string) =>
  supabase
    ? cursorPage<ImprovementHistoryRow>("melhorias", cursor, {
        status,
        publicas: true,
      })
    : Promise.resolve(emptyPage<ImprovementHistoryRow>());
