import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchFeedback } from './TouchFeedback';
import { colors } from '../constants/theme';
type Props = TextInputProps & { label: string; error?: string; password?: boolean; icon?: 'mail-outline' | 'lock-closed-outline' };
export function InputField({ label, error, password, icon, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.field, focused && styles.focused]}>
      {icon && <Ionicons name={icon} size={21} color={colors.icon} />}
      <TextInput {...props} accessibilityLabel={label} underlineColorAndroid="transparent" onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} secureTextEntry={password && !visible} placeholderTextColor={colors.icon} selectionColor={colors.pink} style={[styles.input, Platform.OS === 'web' && styles.webInput]} />
      {password && icon && <TouchFeedback label={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setVisible(!visible)} style={styles.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.pink} /></TouchFeedback>}
    </View>
    {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({ group: { marginTop: 9 }, label: { color: colors.white, fontSize: 14, fontWeight: '600', marginBottom: 7, marginLeft: 4 }, field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream, borderRadius: 19, borderWidth: 1, borderColor: '#FFD2D1', minHeight: 50, paddingHorizontal: 14 }, focused: { backgroundColor: '#FFE4EC' }, webInput: { outlineWidth: 0, outlineStyle: 'solid' }, input: { borderWidth: 0, backgroundColor: 'transparent', flex: 1, color: colors.wine, paddingHorizontal: 8, paddingVertical: 12, fontSize: 16 }, eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, error: { color: colors.white, fontSize: 12, marginTop: 4, marginLeft: 4 } });
