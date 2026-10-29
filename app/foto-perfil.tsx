import { radius } from "../constants/theme";
import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FeaturePage, Action, Message, shared } from "../components/shared/FeaturePage";
import { useSession } from "../features/auth/SessionProvider";
import { useProfile } from "../features/profile/ProfileProvider";
import { saveAvatar, cleanAvatars, AvatarInput } from "../features/profile/avatar";
import { friendlyError } from "../lib/supabase";
export default function AvatarScreen() {
  const { session } = useSession(),
    { profile, refresh } = useProfile();
  const [asset, setAsset] = useState<AvatarInput | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [remove, setRemove] = useState(false);
  const lock = useRef(false);
  async function choose() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });
      if (!result.canceled) {
        const selected = result.assets[0];
        if (selected.fileSize && selected.fileSize > 5242880) {
          setError("Escolha uma foto de até 5 MB.");
          return;
        }
        setAsset(selected);
        setRemove(false);
        setMessage("");
      }
    } catch {
      setError(
        "Não foi possível abrir a galeria. Confira a permissão de fotos.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const warning = await saveAvatar(session.user.id, remove ? null : asset);
      await refresh();
      setAsset(null);
      setRemove(false);
      setMessage(warning || "Foto do perfil atualizada.");
    } catch (e) {
      setError(
        e instanceof Error && !("code" in e) ? e.message : friendlyError(e),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FeaturePage title="Foto do perfil">
      <View style={shared.card}>
        <Text style={shared.note}>
          Escolha uma foto de até 5 MB. Ela fica acessível somente à sua conta.
        </Text>
        {!remove && (asset?.uri || profile?.avatar_url) ? (
          <Image
            source={{ uri: asset?.uri ?? profile!.avatar_url! }}
            accessibilityLabel="Prévia da foto do perfil"
            style={{
              width: 160,
              height: 160,
              borderRadius: radius.pill,
              alignSelf: "center",
            }}
          />
        ) : (
          <Text style={[shared.title, { textAlign: "center", padding: 30 }]}>
            Sem foto
          </Text>
        )}
        <Action
          secondary
          title="Escolher foto na galeria"
          busy={busy}
          onPress={() => void choose()}
        />
        {(asset || profile?.avatar_url) && (
          <Action
            secondary
            title="Remover foto"
            busy={busy}
            onPress={() => {
              setRemove(true);
              setAsset(null);
            }}
          />
        )}
        {(asset || remove) && (
          <>
            <Action
              title="Salvar foto"
              busy={busy}
              onPress={() => void save()}
            />
            <Action
              secondary
              title="Cancelar alteração"
              busy={busy}
              onPress={() => {
                setAsset(null);
                setRemove(false);
              }}
            />
          </>
        )}
        <Action
          secondary
          title="Limpar fotos antigas"
          busy={busy}
          onPress={() => {
            if (!session || lock.current) return;
            lock.current = true;
            setBusy(true);
            void cleanAvatars(session.user.id)
              .then(() => setMessage("Fotos antigas removidas."))
              .catch((e) => setError(friendlyError(e)))
              .finally(() => {
                lock.current = false;
                setBusy(false);
              });
          }}
        />
        <Message text={error} error />
        <Message text={message} />
      </View>
    </FeaturePage>
  );
}
