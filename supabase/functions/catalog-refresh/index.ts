import { observeEdge } from "../_shared/observe.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { createRefreshHandler, type CatalogLease } from "./worker.ts";
import type { CommitResult } from "./ingestion.ts";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: {persistSession: false, autoRefreshToken: false},
});
Deno.serve(observeEdge(createRefreshHandler({
  async reserve(hash) {
    const {data, error} = await admin.rpc("reservar_catalogo_job", {p_token_hash: hash});
    if (error) throw error;
    return data as CatalogLease | null;
  },
  async candidates(rows) {
    const {data, error} = await admin.rpc("candidatos_catalogo", {p_lugares: rows});
    if (error) throw error;
    return data ?? [];
  },
  async commit(lease, batch) {
    const {data, error} = await admin.rpc("confirmar_catalogo_ingestao", {p_lease: lease, p_batch: batch});
    if (error) throw error;
    return data as CommitResult;
  },
  async fail(lease, received, code) {
    const {error} = await admin.rpc("finalizar_catalogo_job", {p_lease: lease, p_recebidos: received, p_erro: code});
    if (error) throw error;
  },
}), "catalog-refresh", "1.1.0-atomic.1"));
