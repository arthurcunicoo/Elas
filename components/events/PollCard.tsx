import { cardSurface, colors, palette, radius, typography } from "../../constants/theme";
import { PrimaryButton, SecondaryButton } from "../shared/Buttons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchFeedback } from "../TouchFeedback";
import { AchievementProgressBar } from "../AchievementProgressBar";
import { pollOptions } from "../../constants/events";
import type { Poll } from "../../features/community/community";
import { friendlyError } from "../../lib/supabase";
export function PollCard({
  poll,
  onVote,
  onRefresh,
  busy = false,
}: {
  poll?: Poll;
  onVote?: (option: string) => Promise<void>;
  onRefresh?: () => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(
    poll?.minha_opcao ?? null,
  );
  const [voted, setVoted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const lock = useRef(false),
    identity = useRef(poll?.id),
    refresh = useRef(onRefresh);
  identity.current = poll?.id;
  refresh.current = onRefresh;
  useEffect(() => {
    setSelected(poll?.minha_opcao ?? null);
    setVoted(false);
    setError("");
  }, [poll?.id, poll?.minha_opcao]);
  const end = poll ? new Date(poll.encerra_em).getTime() : Infinity;
  const closed = poll?.encerrada;
  useEffect(() => {
    setDeadlinePassed(end <= Date.now());
    if (!Number.isFinite(end) || end <= Date.now() || closed) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const remaining = end - Date.now();
      if (remaining <= 0) {
        setDeadlinePassed(true);
        refresh.current?.();
      } else timer = setTimeout(schedule, Math.min(remaining + 50, 2147483647));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [end, closed]);
  const expired = !!poll && (poll.encerrada || deadlinePassed);
  // A successful local tap or the device clock never unlocks real counts.
  const visible = poll ? poll.resultados_visiveis === true : voted;
  const total = visible
    ? (poll?.opcoes.reduce((sum, option) => sum + (option.votos ?? 0), 0) ?? 0)
    : 0;
  const options = poll
    ? poll.opcoes.map((option) => ({
        id: option.id,
        label: option.texto,
        percentage:
          visible && total
            ? Math.round(((option.votos ?? 0) / total) * 100)
            : 0,
      }))
    : pollOptions.map((option) => ({ ...option, id: option.label }));
  async function vote() {
    if (lock.current || busy || expired) return;
    if (!selected) {
      setError("Selecione uma opção para votar.");
      return;
    }
    const id = poll?.id;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      if (poll) {
        if (!onVote)
          throw new Error(
            "Não foi possível enviar o voto. Atualize a enquete e tente novamente.",
          );
        await onVote(selected);
      }
      if (identity.current === id) setVoted(true);
    } catch (e) {
      if (identity.current === id) setError(friendlyError(e));
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>
        {poll?.demonstracao ? "DEMONSTRAÇÃO · " : ""}{expired ? "VOTAÇÃO ENCERRADA" : "VOTAÇÃO ABERTA"}
      </Text>
      <Text style={styles.question}>
        {poll?.pergunta ?? "Qual problema deve ser prioridade na cidade?"}
      </Text>
      <Text style={styles.description}>
        {poll
          ? `${visible ? `${total} ${total === 1 ? "voto" : "votos"} · ` : ""}Até ${new Date(poll.encerra_em).toLocaleString("pt-BR")}`
          : "Participe e ajude a decidir."}
      </Text>
      {poll?.demonstracao && <Text style={styles.description}>Enquete fictícia. Os números são exemplos e seu voto será apenas uma simulação.</Text>}
      {!visible && (
        <Text style={styles.description}>
          Resultados após seu voto ou o encerramento.
        </Text>
      )}
      <View style={styles.options}>
        {options.map((option, index) => (
          <TouchFeedback
            disabled={busy || saving || expired || (!poll && voted)}
            key={option.id}
            label={
              visible
                ? `${option.label}, ${option.percentage}% dos votos`
                : option.label
            }
            role="radio"
            checked={selected === option.id}
            selected={selected === option.id}
            onPress={() => {
              setSelected(option.id);
              setError("");
              setVoted(false);
            }}
            style={[styles.option, selected === option.id && styles.selected]}
          >
            <View style={styles.row}>
              <Text style={styles.label}>{option.label}</Text>
              {visible && (
                <Text style={styles.percentage}>
                  {option.percentage}% dos votos
                </Text>
              )}
            </View>
            {visible && (
              <AchievementProgressBar
                value={option.percentage}
                total={100}
                delay={180 + index * 40}
                poll
              />
            )}
          </TouchFeedback>
        ))}
      </View>
      <PrimaryButton
        disabled={expired || (!poll && voted)}
        busy={busy || saving}
        title={
          expired
            ? "Votação encerrada"
            : poll?.demonstracao
              ? poll.minha_opcao ? "Simular outro voto" : "Simular voto"
              : poll?.minha_opcao
              ? "Atualizar voto"
              : voted
                ? "Voto registrado"
                : "Votar"
        }
        onPress={() => void vote()}
        style={{ marginTop: 16 }}
      />
      {!!poll && !visible && (voted || expired) && !!onRefresh && (
        <SecondaryButton title="Atualizar resultados" onPress={onRefresh} />
      )}
      {(!!error || voted) && (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {error ||
            (poll
              ? "Voto salvo. Você pode alterar sua escolha até o encerramento."
              : "Demonstração: seu voto não foi enviado.")}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { ...cardSurface },
  eyebrow: {
    color: palette.accent,
    fontSize: typography.card,
    fontWeight: "700",
  },
  question: {
    color: colors.wine,
    fontSize: typography.input,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 4,
  },
  description: {
    color: palette.muted,
    fontSize: typography.body,
    marginTop: 3,
  },
  options: { marginTop: 18, gap: 8 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 44,
    borderRadius: radius.small,
  },
  selected: { backgroundColor: palette.infoTint },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    flexWrap: "wrap",
  },
  label: {
    flex: 1,
    flexShrink: 1,
    color: colors.wine,
    fontSize: typography.input,
    fontWeight: "500",
  },
  percentage: {
    flexShrink: 0,
    color: colors.wine,
    fontSize: typography.caption,
    paddingRight: 6,
  },
  feedback: { color: colors.wine, fontSize: typography.caption, marginTop: 8 },
});
