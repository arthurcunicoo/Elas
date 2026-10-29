import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { observeEdge } from "../_shared/observe.ts";
import { createPushHandler, type PushLease } from "./worker.ts";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(observeEdge(createPushHandler({
  async reserve(hash) {
    const { data, error } = await admin.rpc("reservar_push", { p_token_hash: hash });
    if (error) throw error;
    return data as PushLease[];
  },
  async finish(lease, result, ticket) {
    const { error } = await admin.rpc("finalizar_push", { p_lease: lease, p_resultado: result, p_ticket: ticket ?? null });
    if (error) throw error;
  },
}, fetch, Deno.env.get("EXPO_ACCESS_TOKEN")), "push-delivery", "1.1.0-push.1"));
