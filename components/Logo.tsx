import { colors } from "../constants/theme";
import Svg, { Path } from "react-native-svg";
import { logoPaths } from "../constants/logoPaths";

export function Logo({ width }: { width: number }) {
  return (
    <Svg
      accessibilityLabel="ELAS na cidade"
      width={width}
      height={(width * 157) / 271}
      viewBox="0 0 271 157"
    >
      <Path d={logoPaths.white} fill="white" fillRule="evenodd" />
      <Path d={logoPaths.primary} fill={colors.pink} fillRule="evenodd" />
    </Svg>
  );
}
