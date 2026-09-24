import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchFeedback } from '../TouchFeedback';
import { AchievementProgressBar } from '../AchievementProgressBar';
import { colors } from '../../constants/theme';
import { pollOptions } from '../../constants/events';
export function PollCard() {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState(false);
  function vote() { if (!selected) { setError(true); return; } setVoted(true); setError(false); }
  return <View style={styles.card}>
    <Text style={styles.eyebrow}>VOTAÇÃO ABERTA</Text>
    <Text style={styles.question}>Qual problema deve ser prioridade{'\n'}na cidade?</Text>
    <Text style={styles.description}>(Participe e ajude a decidir)</Text>
    <View style={styles.options}>{pollOptions.map((option, index) => <TouchFeedback disabled={voted} key={option.label} label={`${option.label}, ${option.percentage}% votos`} selected={selected === option.label} onPress={() => { if (!voted) { setSelected(option.label); setError(false); } }} style={[styles.option, selected === option.label && styles.selected]}>
      <View style={styles.row}><Text style={styles.label}>{option.label}</Text><Text style={styles.percentage}>{option.percentage}% votos</Text></View>
      <AchievementProgressBar value={option.percentage} total={100} delay={180 + index * 40} poll />
    </TouchFeedback>)}</View>
    <TouchFeedback disabled={voted} label={voted ? 'Voto registrado nesta demonstração' : 'Votar'} onPress={vote} style={styles.button}><Text style={styles.buttonText}>{voted ? '✓ Voto registrado' : 'Votar'}</Text></TouchFeedback>
    {(error || voted) && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{error ? 'Selecione uma opção para votar.' : 'Demonstração: seu voto não foi enviado.'}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 19, paddingBottom: 27, shadowColor: '#30232C', shadowOpacity: .11, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  eyebrow: { color: colors.achievement, fontSize: 15, fontWeight: '700' }, question: { color: colors.wine, fontSize: 16, fontWeight: '600', lineHeight: 22, marginTop: 4 }, description: { color: '#727C88', fontSize: 14, marginTop: 3 },
  options: { marginTop: 18, gap: 0 }, option: { paddingVertical: 3, borderRadius: 7 }, selected: { backgroundColor: '#F2EAFB' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, label: { color: colors.wine, fontSize: 16, fontWeight: '500' }, percentage: { color: colors.wine, fontSize: 11, paddingRight: 6 },
  button: { backgroundColor: colors.pink, borderRadius: 6, minHeight: 44, marginTop: 16 }, buttonText: { textAlign: 'center', color: colors.white, fontSize: 20, fontWeight: '700' }, feedback: { color: colors.wine, fontSize: 12, marginTop: 8 },
});
