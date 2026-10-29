import { readProfileName, saveProfileName } from "../services/profile";
import { changeEmail as updateAccountEmail } from "../services/account";
import { useCallback, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { AccountAction, AccountField, AccountMessage, AccountPage, accountStyles } from "../components/AccountForm";
import { useSession } from "../features/auth/SessionProvider";
import { useProfile } from "../features/profile/ProfileProvider";
import { validEmail } from "../lib/account";
import { backendConfigured, friendlyError } from "../lib/supabase";
export default function PersonalInformation() {
  const { session } = useSession();
  const userId = session?.user.id,
    accountEmail = session?.user.email ?? "";
  const { refresh } = useProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!userId || !backendConfigured)
        return () => {
          active = false;
        };
      setLoading(true);
      setEmail(accountEmail);
      void readProfileName(userId)
        .then((name) => {
          if (active) setName(name);
        })
        .catch((error) => {
          if (active) setError(friendlyError(error));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [userId, accountEmail]),
  );
  async function saveName() {
    if (!session || busy.current || loading) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setError("Informe um nome de até 100 caracteres.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    Keyboard.dismiss();
    try {
      await saveProfileName(session.user.id, trimmed);
      await refresh();
      setName(trimmed);
      setMessage("Nome salvo no seu perfil.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function changeEmail() {
    if (!session || busy.current || loading) return;
    const target = email.trim();
    if (!validEmail(target)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (target.toLowerCase() === session.user.email?.toLowerCase()) {
      setError("Digite um e-mail diferente do atual.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    Keyboard.dismiss();
    try {
      await updateAccountEmail(target);
      setMessage(
        "Solicitação enviada. Confira as mensagens de confirmação nos endereços envolvidos. O e-mail atual continua válido até a alteração ser confirmada.",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <AccountPage title="Informações pessoais">
      {!backendConfigured && (
        <AccountMessage
          text="Configure o projeto Supabase para editar dados de uma conta real."
          error
        />
      )}
      <View style={accountStyles.card}>
        <Text style={accountStyles.section}>Seu nome</Text>
        <AccountField
          label="Nome"
          value={name}
          onChangeText={setName}
          maxLength={100}
          editable={backendConfigured && !loading && !saving}
          autoCapitalize="words"
          autoComplete="name"
        />
        <AccountAction
          title={saving ? "Salvando..." : "Salvar nome"}
          disabled={!backendConfigured || loading || saving}
          onPress={() => void saveName()}
        />
      </View>
      <View style={accountStyles.card}>
        <Text style={accountStyles.section}>E-mail da conta</Text>
        <Text style={accountStyles.detail}>
          Atual: {session?.user.email || "Conta de demonstração"}. A troca exige
          confirmação por e-mail.
        </Text>
        <AccountField
          label="Novo e-mail"
          value={email}
          onChangeText={setEmail}
          editable={backendConfigured && !loading && !saving}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />
        <AccountAction
          title={saving ? "Enviando..." : "Alterar e-mail"}
          disabled={!backendConfigured || loading || saving}
          onPress={() => void changeEmail()}
        />
      </View>
      <AccountMessage text={error} error />
      <AccountMessage text={message} />
    </AccountPage>
  );
}
