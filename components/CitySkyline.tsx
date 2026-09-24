import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCityLayout } from '../constants/cityLayout';
import { usePathname } from 'expo-router';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { colors } from '../constants/theme';
const nativeDriver = Platform.OS !== 'web';
export function CitySkyline() {
  const { width, height } = useWindowDimensions();
  const path = usePathname();
  const reduced = useReducedMotion();
  const { cityHeight, top } = getCityLayout(width, height, path === '/');
  const offset = useRef(new Animated.Value(top)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const entered = useRef(false);
  useEffect(() => {
    if (reduced) { offset.setValue(top); return; }
    if (!entered.current) { offset.setValue(top + 95); entered.current = true; }
    const animation = Animated.spring(offset, { toValue: top, damping: 24, stiffness: 100, mass: 1.2, overshootClamping: true, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [offset, reduced, top]);
  useEffect(() => {
    drift.setValue(0);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 6500, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift, reduced]);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.cream }]}>
    <Animated.View testID="city-motion" style={{ transform: [{ translateY: offset }] }}>
      <View style={{ height: cityHeight, overflow: 'hidden' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.08 }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-width * .015, width * .015] }) }] }]}>
          <Image source={require('../assets/city-modern.jpg')} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        </Animated.View>
        <LinearGradient
          colors={[colors.cream, colors.cream, '#FFF2F200']}
          locations={[0, .12, 1]}
          style={{ position: 'absolute', top: -1, left: 0, right: 0, height: Math.min(100, cityHeight * .25) }}
        />
        <LinearGradient
          colors={['#760B2000', colors.wine, colors.wine]}
          locations={[0, .88, 1]}
          style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: Math.min(140, cityHeight * .34) }}
        />
      </View>
      <View style={{ height: height + 201, marginTop: -1, backgroundColor: colors.wine }} />
    </Animated.View>
  </View>;
}
