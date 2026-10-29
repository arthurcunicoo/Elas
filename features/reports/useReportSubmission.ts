import { useEffect, useRef, useState } from "react";
import { createReport } from "../../services/reports";
import { friendlyError } from "../../lib/supabase";
import { reportPayload, type ReportDraft } from "./reportSubmission";
type Draft = {
  value: ReportDraft;
  ready: boolean;
  prepare(payload: object): Promise<string>;
  clear(): Promise<unknown>;
};
export function useReportSubmission({
  draft,
  owner,
  correction,
  linkedId,
  attachLocation,
  location,
}: {
  draft: Draft;
  owner?: string;
  correction: boolean;
  linkedId?: string;
  attachLocation: boolean;
  location: { latitude: number; longitude: number } | null;
}) {
  const lock = useRef(false),
    mounted = useRef(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [attempted, setAttempted] = useState(false),
    [done, setDone] = useState(false),
    [sentId, setSentId] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function send() {
    if (lock.current || !draft.ready) return;
    setAttempted(true);
    let payload: ReturnType<typeof reportPayload>;
    try {
      payload = reportPayload(draft.value, {
        correction,
        linkedId,
        attachLocation,
        location,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Confira os campos preenchidos.",
      );
      return;
    }
    if (!owner) {
      setError("Entre na sua conta para enviar o relato.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const requestId = await draft.prepare(payload),
        id = await createReport(requestId, payload);
      if (mounted.current) {
        setSentId(id);
        setDone(true);
        await draft.clear();
      }
    } catch (e) {
      if (mounted.current) setError(friendlyError(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, error, setError, attempted, done, sentId, send };
}
