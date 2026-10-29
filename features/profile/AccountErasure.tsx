import { useState, useRef } from "react";
import { Alert, Text, View } from "react-native";
import {
  accountErasureEnabled,
  eraseAccount,
} from "../../services/accountErasure";
import { useSession } from "../auth/SessionProvider";
import { Field, Message, shared } from "../../components/shared/FeaturePage";
import { DangerButton } from "../../components/shared/Buttons";
export function AccountErasure() {
  const { session } = useSession();
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  if (!accountErasureEnabled || !session) return null;
  async function remove() {
    if (lock.current || !session) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const message = await eraseAccount(session.user.id, password, confirmation);
      setPassword("");
      Alert.alert("Conta excluída", message);
    } catch {
      setError(
        "Não foi possível concluir. Confira a senha e conexão. Se iniciou a exclusão, aguarde dois minutos para tentar novamente.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={shared.card}>
      <Text accessibilityRole="header" style={shared.title}>
        Excluir minha conta
      </Text>
      <Text style={shared.note}>
        A exclusão é definitiva: remove perfil, fotos, avaliações, relatos,
        solicitações e participações. Transições administrativas em registros de
        outras pessoas podem permanecer sem sua autoria ou motivo. Não é
        possível recuperar os dados pelo app.
      </Text>
      <Field
        label="Confirme sua senha atual"
        password
        value={password}
        onChangeText={setPassword}
        editable={!busy}
        autoComplete="current-password"
      />
      <Field
        label="Digite EXCLUIR para confirmar"
        value={confirmation}
        onChangeText={setConfirmation}
        editable={!busy}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
      />
      <Message text={error} error />
      <DangerButton
        title="Excluir conta e dados"
        busy={busy}
        disabled={!password || confirmation !== "EXCLUIR"}
        onPress={() => void remove()}
      />
    </View>
  );
}
