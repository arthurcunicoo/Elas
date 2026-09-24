import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { MotionReveal } from './MotionReveal';
import { TouchFeedback } from './TouchFeedback';
export function ProfileHeader({ onEdit, avatar }: { onEdit: () => void; avatar?: ImageSourcePropType }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
    <Text accessibilityRole="header" style={styles.title}>Perfil</Text>
    <MotionReveal duration={340} distance={8}>
      <View style={styles.avatar}>
        {avatar ? <Image source={avatar} style={styles.photo} /> : <Ionicons name="person" size={80} color={colors.pink} />}
        <TouchFeedback label="Alterar foto do perfil" onPress={onEdit} style={styles.edit}><View style={styles.editCircle}><Ionicons name="create-outline" size={19} color={colors.pink} /></View></TouchFeedback>
      </View>
    </MotionReveal>
    <MotionReveal duration={340} delay={50} distance={8}><Text style={styles.name}>Nome Sobrenome</Text><Text style={styles.email}>nomesobrenome@gmail.com</Text></MotionReveal>
  </View>;
}
const styles = StyleSheet.create({ header: { backgroundColor: colors.pink, alignItems: 'center', paddingBottom: 58 }, title: { color: colors.white, fontSize: 21, fontWeight: '800', marginBottom: 8 }, avatar: { width: 102, height: 102, borderRadius: 51, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, photo: { width: 102, height: 102, borderRadius: 51 }, edit: { position: 'absolute', bottom: -4, right: -10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, editCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: colors.wine, shadowOpacity: .12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, name: { color: colors.white, fontSize: 21, fontWeight: '700', marginTop: 7, textAlign: 'center' }, email: { color: '#F6BCCF', fontSize: 13, textAlign: 'center', marginTop: 1 } });
