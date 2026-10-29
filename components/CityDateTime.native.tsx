import { useState } from "react";
import { Text } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Action, shared } from "./shared/FeaturePage";
export function CityDateTime({
  date,
  time,
  onDate,
  onTime,
  disabled = false,
}: {
  date: string;
  time: string;
  onDate: (s: string) => void;
  onTime: (s: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const parsed = date
      ? new Date(`${date}T${time || "12:00"}:00-03:00`)
      : new Date(),
    value = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  return (
    <>
      <Text style={shared.label}>Data e hora (horário de Brasília)</Text>
      <Action
        secondary
        title={date ? date.split("-").reverse().join("/") : "Escolher data"}
        busy={disabled}
        onPress={() => setMode("date")}
      />
      <Action
        secondary
        title={time || "Escolher horário"}
        busy={disabled}
        onPress={() => setMode("time")}
      />
      {mode && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          timeZoneName="America/Sao_Paulo"
          is24Hour
          onChange={(event, selected) => {
            setMode(null);
            if (event.type !== "set" || !selected) return;
            const parts = new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Sao_Paulo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }).formatToParts(selected),
              get = (type: string) => parts.find((p) => p.type === type)!.value;
            if (mode === "date")
              onDate(`${get("year")}-${get("month")}-${get("day")}`);
            else onTime(`${get("hour")}:${get("minute")}`);
          }}
        />
      )}
      <Text style={shared.note}>Horário de Brasília</Text>
    </>
  );
}
