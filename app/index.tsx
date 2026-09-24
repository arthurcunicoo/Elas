import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotionReveal } from '../components/MotionReveal';
import { Logo } from '../components/Logo';
import { PrimaryButton } from '../components/PrimaryButton';
import { AccountLink } from '../components/AccountLink';
export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <ScrollView contentContainerStyle={{ minHeight: height, paddingBottom: Math.max(insets.bottom, 20) }}>
    <View accessible accessibilityLabel="ELAS na cidade" style={[styles.logo, { top: Math.max(insets.top + 8, height * .053) }]}><MotionReveal distance={-25}><Logo width={Math.min(width * .78, 340)} /></MotionReveal></View>
    <View style={{ marginTop: Math.max(height * .786, 350), width: '100%', maxWidth: 480, alignSelf: 'center' }}>
      <MotionReveal delay={250}><PrimaryButton title="Começar" wide onPress={() => router.push('/login')} /></MotionReveal><MotionReveal delay={380}><AccountLink /></MotionReveal>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ logo: { position: 'absolute', width: '100%', alignItems: 'center' } });
