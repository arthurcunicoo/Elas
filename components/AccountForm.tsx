import { colors, ui, typography } from "../constants/theme";
import { StyleSheet, TextInputProps, View } from "react-native";

import { FeaturePage } from "./shared/FeaturePage";
import { Action, Field, Message, shared } from "./shared/FormControls";
export const AccountPage = FeaturePage;
export function AccountField(
  props: TextInputProps & { label: string; password?: boolean },
) {
  return (
    <View style={styles.field}>
      <Field {...props} />
    </View>
  );
}
export function AccountAction({
  title,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
}) {
  return (
    <Action
      title={title}
      onPress={onPress}
      disabled={disabled}
      busy={busy}
      secondary={secondary}
      style={styles.action}
    />
  );
}
export function AccountMessage(props: { text: string; error?: boolean }) {
  return props.text ? (
    <View style={styles.message}>
      <Message {...props} />
    </View>
  ) : null;
}
export const accountStyles = StyleSheet.create({
  card: shared.card,
  section: {
    color: colors.wine,
    fontSize: typography.section,
    fontWeight: "700",
  },
  detail: {
    color: ui.muted,
    fontSize: typography.body,
    lineHeight: 21,
    marginTop: 8,
  },
});
const styles = StyleSheet.create({
  field: { marginTop: 16 },
  action: { marginTop: 18 },
  message: { marginTop: 14 },
});
