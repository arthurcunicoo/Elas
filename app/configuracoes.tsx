import { AccountErasure } from "../features/profile/AccountErasure";
import { changePassword as updateAccountPassword } from "../services/account";
import { PushSettings } from "../features/community/PushSettings";
import { useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { useSession } from "../features/auth/SessionProvider";
import { AccountAction, AccountField, AccountMessage, AccountPage, accountStyles } from "../components/AccountForm";
import { backendConfigured, friendlyError } from "../lib/supabase";
export default function Settings() {
  const { session } = useSession();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function updatePassword() {
    if (busy.current || !backendConfigured || !session?.user.email) return;
    if (!current) {
      setError("Informe sua senha atual.");
      return;
    }
    if (password.length < 8) {
      setError("Use pelo menos 8 caracteres na nova senha.");
      return;
    }
    if (password !== again) {
      setError("As senhas novas não coincidem.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    Keyboard.dismiss();
    try {
      await updateAccountPassword(
        session.user.id,
        session.user.email!,
        current,
        password,
      );
      setCurrent("");
      setPassword("");
      setAgain("");
      setMessage("Senha alterada com sucesso.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <AccountPage title="Configurações">
      <PushSettings />
      <AccountErasure />
      {!backendConfigured && (
        <AccountMessage
          text="Configure o projeto Supabase para alterar a senha de uma conta real."
          error
        />
      )}
      <View style={accountStyles.card}>
        <Text style={accountStyles.section}>Alterar senha</Text>
        <Text style={accountStyles.detail}>
          Use sua senha atual para proteger a alteração. Se você a esqueceu,
          saia da conta e use “Esqueci minha senha” no login.
        </Text>
        <AccountField
          label="Senha atual"
          value={current}
          onChangeText={setCurrent}
          password
          editable={backendConfigured && !saving}
          autoCapitalize="none"
          autoComplete="current-password"
        />
        <AccountField
          label="Nova senha"
          value={password}
          onChangeText={setPassword}
          password
          editable={backendConfigured && !saving}
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <AccountField
          label="Repita a nova senha"
          value={again}
          onChangeText={setAgain}
          password
          editable={backendConfigured && !saving}
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <AccountAction
          title={saving ? "Salvando..." : "Alterar senha"}
          disabled={!backendConfigured || saving}
          onPress={() => void updatePassword()}
        />
      </View>
      <AccountMessage text={error} error />
      <AccountMessage text={message} />
    </AccountPage>
  );
}
