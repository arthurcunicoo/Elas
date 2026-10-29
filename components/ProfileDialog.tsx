import { ui, typography } from "../constants/theme";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton, DangerButton } from "./shared/Buttons";
import { AppSheet } from "./AppSheet";
export type ProfileNotice = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  confirm?: () => void;
};
export function ProfileDialog({
  notice,
  onClose,
}: {
  notice: ProfileNotice | null;
  onClose: () => void;
}) {
  const ConfirmButton = notice?.destructive ? DangerButton : PrimaryButton;
  return (
    <AppSheet
      visible={!!notice}
      title={notice?.title ?? "Mensagem"}
      icon={
        notice?.confirm ? "help-circle-outline" : "information-circle-outline"
      }
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <ConfirmButton
            title={
              notice?.confirm ? (notice.confirmLabel ?? "Confirmar") : "Entendi"
            }
            onPress={() => {
              const confirm = notice?.confirm;
              onClose();
              confirm?.();
            }}
          />
          {!!notice?.confirm && (
            <TextButton title="Cancelar" onPress={onClose} />
          )}
        </View>
      }
    >
      <Text style={styles.message}>{notice?.message}</Text>
    </AppSheet>
  );
}
const styles = StyleSheet.create({
  message: { lineHeight: 24, fontSize: typography.input, color: ui.muted },
  actions: { gap: 8 },
});
