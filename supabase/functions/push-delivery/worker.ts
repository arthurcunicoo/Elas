import { readBoundedJson } from "../lugares-osm/network.js";
export type PushLease = { id: string; lease: string; notificationId: string; token: string; ticket: string | null };
export type PushResult = "ticket" | "ok" | "retry" | "invalid" | "permanent" | "missing";
export type PushStore = {
  reserve: (hash: string) => Promise<PushLease[]>;
  finish: (lease: string, result: PushResult, ticket?: string) => Promise<void>;
};
type ExpoResult = { status?: string; id?: string; details?: { error?: string } };
const outcome = (value?: ExpoResult): PushResult => value?.status === "ok" ? "ok" :
  value?.details?.error === "DeviceNotRegistered" ? "invalid" :
  ["MessageTooBig", "InvalidCredentials", "MismatchSenderId"].includes(value?.details?.error ?? "") ? "permanent" : "retry";
export function createPushHandler(store: PushStore, upstream: typeof fetch = fetch, accessToken?: string) {
  const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  async function request(endpoint: "send" | "getReceipts", body: unknown) {
    const response = await upstream(`https://exp.host/--/api/v2/push/${endpoint}`, {
      method: "POST", signal: AbortSignal.timeout(15000), headers: {
        "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }, body: JSON.stringify(body),
    });
    if (!response.ok) throw Object.assign(new Error("Push upstream failed"), {
      permanent: response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status),
    });
    const payload = await readBoundedJson(response, 256 * 1024);
    if (!payload || typeof payload !== "object" || !payload.data) throw new Error("Invalid push response");
    return payload.data;
  }
  return async (req: Request) => {
    if (req.method !== "POST") return reply(405, { message: "Método inválido" });
    const token = req.headers.get("x-push-job-key");
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return reply(401, { message: "Acesso negado" });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
    let jobs: PushLease[];
    try { jobs = await store.reserve(hash); } catch (e) {
      if ((e as { code?: string })?.code === "42501") return reply(401, { message: "Acesso negado" });
      throw e;
    }
    if (!Array.isArray(jobs) || jobs.length > 50) throw new Error("Invalid push lease batch");
    const counts = { reserved: jobs.length, accepted: 0, completed: 0, retry: 0, failed: 0 };
    async function finish(job: PushLease, result: PushResult, ticket?: string) {
      await store.finish(job.lease, result, ticket);
      if (result === "ticket") counts.accepted++;
      else if (result === "ok") counts.completed++;
      else if (result === "retry" || result === "missing") counts.retry++;
      else counts.failed++;
    }
    const receipts = jobs.filter(j => j.ticket), sends = jobs.filter(j => !j.ticket);
    if (receipts.length) {
      let data: Record<string, ExpoResult> | undefined, failure: PushResult = "retry";
      try { data = await request("getReceipts", { ids: receipts.map(j => j.ticket) }); }
      catch (e) { if ((e as { permanent?: boolean })?.permanent) failure = "permanent"; }
      for (const job of receipts) await finish(job, data ? data[job.ticket!] ? outcome(data[job.ticket!]) : "missing" : failure);
    }
    if (sends.length) {
      let data: ExpoResult[] | undefined, failure: PushResult = "retry";
      try {
        const response = await request("send", sends.map(job => ({
          to: job.token, title: "ELAS · nova atualização", body: "Há uma atualização na sua participação. Abra o app para conferir.",
          data: { notificationId: job.notificationId }, channelId: "participacao", ttl: 86400, collapseId: job.notificationId,
        })));
        if (!Array.isArray(response) || response.length !== sends.length) throw new Error("Push ticket count mismatch");
        data = response;
      } catch (e) { if ((e as { permanent?: boolean })?.permanent) failure = "permanent"; }
      for (let i = 0; i < sends.length; i++) {
        const ticket = data?.[i];
        await finish(sends[i], ticket?.status === "ok" && typeof ticket.id === "string" && ticket.id.length > 0 && ticket.id.length <= 200 ? "ticket" : data ? outcome(ticket) === "ok" ? "retry" : outcome(ticket) : failure, ticket?.id);
      }
    }
    return reply(200, counts);
  };
}
