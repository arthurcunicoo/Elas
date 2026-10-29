import { serviceTimeZone } from "../constants/serviceTimeZone";
import { palette, typography } from "../constants/theme";
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { Field } from "./shared/FeaturePage";
export function CityDateTime({
  date,
  time,
  onDate,
  onTime,
  disabled = false,
  timeZone = serviceTimeZone,
}: {
  date: string;
  time: string;
  onDate: (s: string) => void;
  onTime: (s: string) => void;
  disabled?: boolean;
  timeZone?: string;
}) {
  const [display, setDisplay] = useState(
    date ? date.split("-").reverse().join("/") : "",
  );
  const emitted=useRef(date);
  useEffect(()=>{if(date!==emitted.current){emitted.current=date;setDisplay(date?date.split("-").reverse().join("/"):"");}},[date]);
  return (
    <>
      <Field
        label="Data (dia/mês/ano)"
        value={display}
        keyboardType="number-pad"
        editable={!disabled}
        maxLength={10}
        placeholder="01/11/2026"
        onChangeText={(value) => {
          const digits = value.replace(/\D/g, "").slice(0, 8),
            formatted = digits
              .replace(/^(\d{2})(\d)/, "$1/$2")
              .replace(/^(\d{2}\/\d{2})(\d)/, "$1/$2");
          setDisplay(formatted);
          const next=digits.length===8?`${digits.slice(4)}-${digits.slice(2,4)}-${digits.slice(0,2)}`:"";
          emitted.current=next;onDate(next);
        }}
      />
      <Field
        label={`Hora (${timeZone})`}
        value={time}
        keyboardType="number-pad"
        editable={!disabled}
        maxLength={5}
        placeholder="14:00"
        onChangeText={(s) => {
          const digits = s.replace(/\D/g, "").slice(0, 4);
          onTime(digits.replace(/^(\d{2})(\d)/, "$1:$2"));
        }}
      />
      <Text style={{ color: palette.muted, fontSize: typography.caption }}>
        Fuso: {timeZone}
      </Text>
    </>
  );
}
