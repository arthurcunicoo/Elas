import { TextInputProps, View } from "react-native";
import { Field } from "./shared/FormControls";
type Props = TextInputProps & {
  label: string;
  error?: string;
  password?: boolean;
  icon?: "mail-outline" | "lock-closed-outline";
};
export function InputField(props: Props) {
  return (
    <View style={{ marginTop: 10 }}>
      <Field {...props} tone="inverse" />
    </View>
  );
}
