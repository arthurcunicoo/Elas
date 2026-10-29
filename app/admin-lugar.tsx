import { readEditablePlace, correctPlace } from "../services/adminPlaces";
import { useCallback, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { FeaturePage, Field, Action, Message, shared } from "../components/shared/FeaturePage";
import { HistoryList } from "../features/reports/HistoryList";
import { useProfile } from "../features/profile/ProfileProvider";
import { friendlyError } from "../lib/supabase";
export default function EditPlace() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { role } = useProfile();
  const [name, setName] = useState(""),
    [address, setAddress] = useState(""),
    [photo, setPhoto] = useState(""),
    [reason, setReason] = useState(""),
    [stamp, setStamp] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (role !== "admin" || !id) return;
      void readEditablePlace(id)
        .then((data) => {
          if (!active) return;
          setName(data.nome);
          setAddress(data.endereco);
          setPhoto(data.foto_url ?? "");
          setStamp(data.atualizado_em);
        })
        .catch((error) => {
          if (active) setError(friendlyError(error));
        });
      return () => {
        active = false;
      };
    }, [id, role]),
  );
  async function save() {
    if (lock.current || !stamp) return;
    if (
      reason.trim().length < 5 ||
      !name.trim() ||
      !address.trim() ||
      (photo && !photo.startsWith("https://"))
    ) {
      setError("Confira nome, endereço, URL HTTPS e motivo da correção.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const stampValue = stamp;
      const updatedStamp = await correctPlace(
        id,
        stampValue,
        name,
        address,
        photo,
        reason,
      );
      setMessage(
        "Cadastro corrigido. Referência OSM, avaliações e favoritos preservados.",
      );
      setStamp(updatedStamp);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FeaturePage title="Corrigir cadastro do lugar">
      {role !== "admin" ? (
        <Message text="Acesso exclusivo de administrador." />
      ) : (
        <View style={shared.card}>
          <Text style={shared.note}>
            Use informações verificadas no relato de correção. O ID e a origem
            do catálogo permanecem vinculados.
          </Text>
          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            editable={!busy}
            maxLength={120}
          />
          <Field
            label="Endereço"
            value={address}
            onChangeText={setAddress}
            editable={!busy}
            maxLength={200}
          />
          <Field
            label="Foto real (URL HTTPS opcional)"
            value={photo}
            onChangeText={setPhoto}
            editable={!busy}
            maxLength={2000}
            autoCapitalize="none"
          />
          <Field
            label="Motivo da correção"
            value={reason}
            onChangeText={setReason}
            editable={!busy}
            multiline
            maxLength={500}
          />
          <Message text={error} error />
          <Message text={message} />
          <Action
            title="Salvar correção"
            busy={busy || !stamp}
            onPress={() => void save()}
          />
          {stamp && <HistoryList key={stamp} kind="lugar" id={id} />}
        </View>
      )}
    </FeaturePage>
  );
}
