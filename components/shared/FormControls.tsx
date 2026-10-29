import { cardSurface, colors, glass, ui, formLayout, palette, radius, typography } from "../../constants/theme";
import { Button } from "./Buttons";
import { forwardRef, useId, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "../icons/Ionicon";
import { TouchFeedback } from "../TouchFeedback";

export const Field = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    error?: string;
    hint?: string;
    password?: boolean;
    success?: string;
    tone?: "default" | "inverse";
    icon?: "mail-outline" | "lock-closed-outline";
  }
>(function Field(
  {
    label,
    style,
    error,
    hint,
    password = false,
    success,
    tone = "default",
    icon,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const labelId = useId();
  const { fontScale = 1 } = useWindowDimensions();
  const disabled = props.editable === false;
  const message = error || success || hint;
  const ink =
    tone === "inverse"
      ? palette.surface
      : error
        ? palette.error
        : success
          ? palette.success
          : ui.muted;
  return (
    <View style={{ gap: 8 }}>
      <Text
        nativeID={labelId}
        style={[
          shared.label,
          tone === "inverse" && { color: palette.surface },
          error && tone !== "inverse" && { color: palette.error },
        ]}
      >
        {label}
      </Text>
      <View style={{ position: "relative" }}>
        {icon && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 15,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <Ionicons name={icon} size={21} color={palette.brand} />
          </View>
        )}
        <TextInput
          {...props}
          ref={ref}
          secureTextEntry={password ? !visible : props.secureTextEntry}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityLabelledBy={labelId}
          aria-invalid={!!error}
          accessibilityHint={message || props.accessibilityHint}
          accessibilityState={{ ...props.accessibilityState, disabled }}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          underlineColorAndroid="transparent"
          selectionColor={colors.pink}
          placeholderTextColor={palette.muted}
          style={[
            shared.input,
            {
              minHeight: Math.max(
                formLayout.inputHeight,
                Math.ceil(22 * fontScale + 28),
              ),
            },
            tone === "inverse" && {
              backgroundColor: glass.wineInput,
              borderColor: glass.pillBorder,
              borderRadius: radius.large,
            },
            success && !error && { borderColor: palette.success },
            props.multiline && { minHeight: 128, textAlignVertical: "top" },
            focused && {
              borderColor: colors.pink,
              backgroundColor: palette.focusSurface,
            },
            error ? { borderColor: palette.error } : undefined,
            Platform.OS === "web" && { outlineWidth: 0 },
            password && { paddingRight: 60 },
            icon && { paddingLeft: 46 },
            disabled && { backgroundColor: palette.disabled, color: ui.muted },
            style,
          ]}
        />
        {password && (
          <TouchFeedback
            label={visible ? "Ocultar senha" : "Mostrar senha"}
            disabled={disabled}
            onPress={() => setVisible((v) => !v)}
            style={{
              position: "absolute",
              right: 3,
              top: Math.max(
                0,
                (Math.max(
                  formLayout.inputHeight,
                  Math.ceil(22 * fontScale + 28),
                ) -
                  48) /
                  2,
              ),
              width: 48,
              height: 48,
              minHeight: 48,
              alignItems: "center",
            }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.pink}
            />
          </TouchFeedback>
        )}
      </View>
      {!!message && (
        <Text
          accessibilityRole={error ? "alert" : undefined}
          accessibilityLiveRegion="polite"
          style={{
            color: ink,
            fontSize: typography.caption,
            lineHeight: 18,
          }}
        >
          {message}
        </Text>
      )}
    </View>
  );
});
export function Action({
  title,
  onPress,
  busy = false,
  secondary = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Button
      title={title}
      onPress={onPress}
      busy={busy}
      disabled={disabled}
      variant={secondary ? "secondary" : "primary"}
      style={style}
    />
  );
}
export function Message({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return text ? (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{ color: error ? palette.error : ui.muted, lineHeight: 21 }}
    >
      {text}
    </Text>
  ) : null;
}
export const shared = StyleSheet.create({
  card: { ...cardSurface, gap: 10 },
  title: { fontSize: 17, fontWeight: "700", color: colors.wine },
  note: { fontSize: typography.secondary, color: ui.muted, lineHeight: 20 },
  label: { fontSize: typography.body, fontWeight: "700", color: colors.wine },
  input: {
    minHeight: formLayout.inputHeight,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: formLayout.controlRadius,
    backgroundColor: glass.input,
    color: ui.text,
    fontSize: typography.input,
    lineHeight: 22,
  },
  button: {
    minHeight: formLayout.buttonHeight,
    borderRadius: formLayout.controlRadius,
    paddingHorizontal: 12,
    backgroundColor: colors.pink,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
});
