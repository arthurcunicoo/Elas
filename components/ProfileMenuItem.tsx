import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchFeedback } from './TouchFeedback';
import { colors } from '../constants/theme';
export function ProfileMenuItem({ title, icon, onPress }: { title: string; icon: ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return <TouchFeedback label={title} onPress={onPress} style={styles.card}><View style={styles.row}><Ionicons name={icon} size={20} color={colors.pink} /><Text style={styles.text}>{title}</Text><Ionicons name="chevron-forward" size={21} color="#C6C6C6" /></View></TouchFeedback>;
}
const styles = StyleSheet.create({ card: { minHeight: 44, borderRadius: 13, backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: .045, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 10 }, text: { flex: 1, color: colors.wine, fontSize: 13 } });
