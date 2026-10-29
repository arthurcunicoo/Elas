import type {ShowcaseRow} from "../../services/showcase";
import type {Poll} from "../community/community";
import type {Report} from "../../services/reports";
export function demonstrationPolls(rows: ShowcaseRow[], closed: boolean, now = Date.now()): Poll[] {
  return rows.flatMap(row => {
    const data = row.dados as {opcoes?: unknown} | undefined;
    if (!row.inicia_em || !Number.isFinite(Date.parse(row.inicia_em)) || !Array.isArray(data?.opcoes)) return [];
    const opcoes = data.opcoes as Poll["opcoes"];
    if (opcoes.length < 2 || opcoes.length > 6 || opcoes.some(option => !option || typeof option.id !== "string" || !option.id.startsWith("demo:") || typeof option.texto !== "string" || !Number.isInteger(option.votos) || option.votos! < 0)) return [];
    const ended = Date.parse(row.inicia_em) <= now;
    return ended !== closed ? [] : [{id: row.id, pergunta: row.titulo, encerra_em: row.inicia_em, minha_opcao: null,
      encerrada: ended, resultados_visiveis: ended, opcoes: opcoes.map(option => ({...option, votos: ended ? option.votos : null})), demonstracao: true}];
  });
}
export function demonstrateVote(poll: Poll, option: string): Poll {
  if (poll.encerrada || !poll.demonstracao || !poll.id.startsWith("demo:") || !poll.opcoes.some(value => value.id === option)) throw Error("Voto de demonstração inválido.");
  return {...poll, minha_opcao: option, resultados_visiveis: true};
}
export function demonstrationResult(poll: Poll, source: ShowcaseRow | undefined, option: string): Poll {
  const result = demonstrateVote(poll, option);
  const values = (source?.dados as {opcoes?: {id: string; votos: number}[]} | undefined)?.opcoes ?? [];
  return {...result, opcoes: poll.opcoes.map(value => {
    const count = values.find(item => item.id === value.id)?.votos ?? 0;
    return {...value, votos: count + (value.id === option ? 1 : 0)};
  })};
}
export function demonstrationReports(rows: ShowcaseRow[]): Report[] {
  return rows.map(row => ({id: row.id, lugar_id: row.lugar_id, categoria: String((row.dados as {categoria?: string} | undefined)?.categoria ?? "Outro"),
    descricao: row.descricao, local_texto: row.local_texto, latitude: null, longitude: null, status: "pendente", criado_em: row.criado_em, demonstracao: true}));
}
export function demonstrationImpactCounts(rows: ShowcaseRow[]) {
  const counts = {solicitada: 0, em_andamento: 0, concluida: 0};
  for (const row of rows) if (row.estado === "solicitada" || row.estado === "em_andamento" || row.estado === "concluida") counts[row.estado]++;
  return counts;
}
