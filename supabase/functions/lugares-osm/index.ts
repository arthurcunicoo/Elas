import { observeEdge } from "../_shared/observe.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { createCatalogHandler, type CatalogResult } from "./catalog.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const client = (authorization: string) =>
  createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
// Read-only compatibility endpoint. New clients call the indexed RPC directly.
Deno.serve(
  observeEdge(
    createCatalogHandler({
      async authenticate(authorization) {
        const { data, error } = await client(authorization).auth.getUser();
        return !error && !!data.user && !data.user.is_anonymous;
      },
      async list(bounds, category, authorization) {
        const { data, error } = await client(authorization).rpc(
          "mapa_lugares",
          {
            p_sul: bounds.south,
            p_oeste: bounds.west,
            p_norte: bounds.north,
            p_leste: bounds.east,
            p_categoria: category,
          },
        );
        if (error) throw error;
        return data as CatalogResult;
      },
    }),
    "lugares-osm",
    "1.1.0-observability.2",
  ),
);
