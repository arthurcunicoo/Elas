import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { publicOfflineStore, type PublicSnapshot } from "../../lib/publicOffline";
import { Field, Action, shared } from "../../components/shared/FeaturePage";
export function OfflinePlaces({
  owner,
  onReconnect,
}: {
  owner: string;
  onReconnect: () => void;
}) {
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null),
    [ready, setReady] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    void publicOfflineStore
      .read(owner)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [owner]);
  const rows =
    snapshot?.rows.filter((row) =>
      `${row.name} ${row.address}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.trim().toLocaleLowerCase("pt-BR")),
    ) ?? [];
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text accessibilityRole="header" style={shared.title}>
        Lugares salvos · offline
      </Text>
      <Text style={shared.note}>
        {snapshot
          ? `Salvos em ${new Date(snapshot.savedAt).toLocaleString("pt-BR")}. Estas informações podem estar desatualizadas.`
          : ready
            ? "Não há lugares salvos válidos nesta conta."
            : "Buscando lugares salvos…"}
      </Text>
      <Text style={shared.note}>
        Somente nomes, endereços e coordenadas do catálogo. Avaliações, relatos,
        inscrições, moderação e envio exigem conexão. Nenhum relato será enviado
        automaticamente.
      </Text>
      <Action title="Verificar conexão novamente" onPress={onReconnect} />
      {snapshot && (
        <Field
          label="Buscar entre os lugares salvos"
          value={query}
          onChangeText={setQuery}
          maxLength={100}
        />
      )}
      {rows.map((row) => (
        <View key={row.id} style={shared.card}>
          <Text style={shared.label}>{row.name}</Text>
          <Text style={shared.note}>{row.address}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
