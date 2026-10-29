import { fonts, glass, palette, radius, typography, formLayout, layout } from "../../constants/theme";
import { type ComponentProps } from "react";
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "../icons/Ionicon";
import { TouchFeedback } from "../TouchFeedback";

type ButtonProps = {
  title: string;
  testID?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};
type Variant = "primary" | "secondary" | "text" | "danger";
export function Button({
  title,
  testID,
  onPress,
  disabled = false,
  busy = false,
  style,
  variant = "primary",
}: ButtonProps & { variant?: Variant }) {
  const ink =
    variant === "secondary" || variant === "text"
      ? palette.brand
      : palette.surface;
  return (
    <TouchFeedback
      testID={testID}
      label={title}
      onPress={onPress}
      disabled={disabled || busy}
      busy={busy}
      style={[styles.base, styles[variant], style]}
    >
      {busy ? (
        <ActivityIndicator
          color={ink}
          accessibilityLabel={`${title}. Em andamento`}
        />
      ) : (
        <Text style={[styles.label, { color: ink }]}>{title}</Text>
      )}
    </TouchFeedback>
  );
}
export const PrimaryButton = (props: ButtonProps) => (
  <Button {...props} variant="primary" />
);
export const SecondaryButton = (props: ButtonProps) => (
  <Button {...props} variant="secondary" />
);
export const TextButton = (props: ButtonProps) => (
  <Button {...props} variant="text" />
);
export const DangerButton = (props: ButtonProps) => (
  <Button {...props} variant="danger" />
);
export function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
  inverse = false,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
  inverse?: boolean;
}) {
  return (
    <TouchFeedback
      label={label}
      onPress={onPress}
      disabled={disabled}
      focusTone={inverse ? "inverse" : "brand"}
      style={[styles.icon, inverse && styles.iconInverse]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={inverse ? palette.surface : palette.brand}
      />
    </TouchFeedback>
  );
}
const styles = StyleSheet.create({
  base: {
    minHeight: formLayout.buttonHeight,
    borderRadius: radius.medium,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: palette.brand,
    shadowColor: palette.brand,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  secondary: {
    backgroundColor: glass.surfaceSoft,
    borderWidth: 1,
    borderColor: glass.tintedBorder,
  },
  text: { backgroundColor: "transparent" },
  danger: { backgroundColor: palette.error },
  label: {
    fontFamily: fonts.display,
    fontSize: typography.button,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  icon: {
    width: layout.touch,
    minHeight: layout.touch,
    height: layout.touch,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.medium,
  },
  iconInverse: {
    backgroundColor: glass.pill,
    borderWidth: 1,
    borderColor: glass.pillBorder,
  },
});
