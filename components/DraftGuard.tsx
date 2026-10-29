import { useEffect, useRef, useState } from "react";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { ProfileDialog, ProfileNotice } from "./ProfileDialog";
export function DraftGuard({
  enabled,
  saved = true,
  onSave,
}: {
  enabled: boolean;
  saved?: boolean;
  onSave?: () => Promise<unknown>;
}) {
  const navigation = useNavigation(),
    [notice, setNotice] = useState<ProfileNotice | null>(null);
  const saving = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  usePreventRemove(enabled, ({ data }) =>
    setNotice({
      title: "Sair sem enviar?",
      message: saved
        ? "Seu rascunho ficará salvo neste aparelho por até 24 horas. Ele será apagado quando você sair da conta."
        : "Não foi possível salvar o rascunho neste aparelho. Sair agora pode perder os campos preenchidos.",
      confirmLabel: "Sair e guardar",
      confirm: () => {
        if (saving.current) return;
        saving.current = true;
        void Promise.resolve().then(() => onSave?.()).then(() => {
          if (active.current) navigation.dispatch(data.action);
        }).catch(() => {
          if (active.current) setNotice({ title: "Rascunho não salvo", message: "Não foi possível guardar os campos. Volte ao formulário para tentar novamente ou saia sem salvar.", confirmLabel: "Sair sem salvar", destructive: true, confirm: () => navigation.dispatch(data.action) });
        }).finally(() => { saving.current = false; });
      },
    }),
  );
  return <ProfileDialog notice={notice} onClose={() => setNotice(null)} />;
}
