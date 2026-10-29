import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import { observeEdge } from "../_shared/observe.ts";
import { createErasureHandler } from "./worker.ts";
const url = Deno.env.get("SUPABASE_URL")!,
  key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  observeEdge(
    createErasureHandler({
      async authenticate(jwt) {
        const { data, error } = await admin.auth.getUser(jwt);
        return error || !data.user?.email
          ? null
          : { id: data.user.id, email: data.user.email };
      },
      async verifyPassword(email, password, expected) {
        const checker = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        try {
          const { data, error } = await checker.auth.signInWithPassword({
            email,
            password,
          });
          return !error && data.user?.id === expected;
        } finally {
          await checker.auth.signOut({ scope: "local" });
        }
      },
      async begin(id) {
        const { data, error } = await admin.rpc("iniciar_exclusao_conta", {
          p_usuario: id,
        });
        if (error) throw error;
        return data;
      },
      async revoke(jwt) {
        const { error } = await admin.auth.admin.signOut(jwt, "global");
        if (error) throw error;
      },
      async removeAvatars(id) {
        for (let batch = 0; batch < 20; batch++) {
          const { data, error } = await admin.storage
            .from("avatars")
            .list(id, { limit: 100 });
          if (error) throw error;
          if (!data?.length) return;
          if (data.some((f) => !f.id || f.name.includes("/")))
            throw Error("Unexpected avatar path");
          const removed = await admin.storage
            .from("avatars")
            .remove(data.map((f) => `${id}/${f.name}`));
          if (removed.error) throw removed.error;
        }
        throw Error("Avatar cleanup requires retry");
      },
      async erase(id) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
      },
    }),
    "account-erasure",
    "1.1.0-system.1",
  ),
);
