import { ComponentProps, memo } from "react";
import { StyleSheet } from "react-native";
import Glyph from "@expo/vector-icons/MaterialCommunityIcons";
type Props = ComponentProps<typeof Glyph>;
// Icon fonts are graphics. Text accessibility scaling remains enabled on labels.
const Icon = memo(function Icon({ size = 24, style, ...props }: Props) {
  return <Glyph {...props} size={size} allowFontScaling={false}
    style={[styles.glyph, { width: size, height: size, lineHeight: size }, style]} />;
});
const styles = StyleSheet.create({ glyph: { includeFontPadding: false, textAlign: "center", textAlignVertical: "center", flexShrink: 0 } });
export default Icon;
