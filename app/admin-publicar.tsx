import { cityInstant } from "../features/community/dates";
import { useServiceTimeZone } from "../hooks/useServiceTimeZone";
import { palette } from "../constants/theme";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { FeaturePage, Field, Action, Message, shared } from "../components/shared/FeaturePage";
import { CityDateTime } from "../components/CityDateTime";
import { TouchFeedback } from "../components/TouchFeedback";
import { useProfile } from "../features/profile/ProfileProvider";
import { publishEvent, publishPoll } from "../features/community/community";
import { friendlyError } from "../lib/supabase";
export default function Publish() {
  const timeZone = useServiceTimeZone();
  const { role } = useProfile(),
    [poll, setPoll] = useState(false),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [place, setPlace] = useState(""),
    [options, setOptions] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const lock = useRef(false);
  async function send() {
    if (lock.current) return;
    let instant: Date;
    try { instant = new Date(cityInstant(date, time, timeZone)); }
    catch { setError("Informe uma data e hora válidas no fuso da cidade."); return; }
    if (instant.getTime() <= Date.now()) { setError("Informe data e hora futuras nos formatos indicados."); return; }
    if (title.trim().length < (poll ? 5 : 3)) {
      setError("Preencha o título ou a pergunta.");
      return;
    }
    const choices = options
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      poll &&
      (choices.length < 2 ||
        choices.length > 6 ||
        new Set(choices).size !== choices.length)
    ) {
      setError("Informe de 2 a 6 opções diferentes, uma por linha.");
      return;
    }
    if (!poll && (description.trim().length < 5 || place.trim().length < 2)) {
      setError("Preencha descrição e local.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (poll) await publishPoll(title.trim(), choices, instant.toISOString());
      else
        await publishEvent(
          title.trim(),
          description.trim(),
          place.trim(),
          instant.toISOString(),
        );
      setSuccess(poll ? "Enquete publicada." : "Evento publicado.");
      setTitle("");
      setDescription("");
      setPlace("");
      setOptions("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <FeaturePage title="Publicar na cidade">
      {role !== "admin" ? (
        <Message text="Acesso exclusivo de administrador." />
      ) : (
        <View style={shared.card}>
          <View style={shared.row}>
            {[false, true].map((value) => (
              <TouchFeedback
                label={value ? "Enquete" : "Evento"}
                disabled={busy}
                selected={poll === value}
                key={String(value)}
                onPress={() => {
                  setPoll(value);
                  setError("");
                  setSuccess("");
                }}
                style={[
                  shared.chip,
                  poll === value && { backgroundColor: palette.brand },
                ]}
              >
                <Text
                  style={{ color: poll === value ? "white" : palette.brand }}
                >
                  {value ? "Enquete" : "Evento"}
                </Text>
              </TouchFeedback>
            ))}
          </View>
          <Field
            label={poll ? "Pergunta" : "Título do evento"}
            value={title}
            editable={!busy}
            onChangeText={setTitle}
            maxLength={poll ? 200 : 100}
          />
          {poll ? (
            <Field
              label="Opções (uma por linha, de 2 a 6)"
              value={options}
              editable={!busy}
              onChangeText={setOptions}
              multiline
              maxLength={726}
              style={{ minHeight: 120 }}
            />
          ) : (
            <>
              <Field
                label="Descrição"
                value={description}
                editable={!busy}
                onChangeText={setDescription}
                multiline
                maxLength={2000}
              />
              <Field
                label="Local"
                value={place}
                editable={!busy}
                onChangeText={setPlace}
                maxLength={150}
              />
            </>
          )}
          <CityDateTime timeZone={timeZone}
            date={date}
            time={time}
            onDate={setDate}
            onTime={setTime}
            disabled={busy}
          />
          <Text style={shared.note}>
            A publicação ficará visível para as contas do aplicativo.
          </Text>
          <Message text={error} error />
          <Message text={success} />
          <Action
            title={poll ? "Publicar enquete" : "Publicar evento"}
            busy={busy}
            onPress={() => void send()}
          />
        </View>
      )}
    </FeaturePage>
  );
}
