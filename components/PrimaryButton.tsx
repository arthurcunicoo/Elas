import { StyleSheet, Text } from 'react-native';
import { TouchFeedback } from './TouchFeedback';
import { colors } from '../constants/theme';
export function PrimaryButton({ title, onPress, wide = false, disabled = false }: { title: string; onPress: () => void; wide?: boolean; disabled?: boolean }) {
  return <TouchFeedback disabled={disabled} label={title} onPress={onPress} pressedScale={.94} style={[styles.button, { width: wide ? '67%' : '64%' }]}><Text style={styles.text}>{title}</Text></TouchFeedback>;
}
const styles = StyleSheet.create({ button: { alignSelf: 'center', backgroundColor: colors.pink, borderRadius: 17, minHeight: 52, paddingVertical: 9, paddingHorizontal: 12, shadowColor: '#390416', shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, shadowOpacity: .2, elevation: 4 }, text: { textAlign: 'center', color: colors.white, fontSize: 27, fontWeight: '600' } });
