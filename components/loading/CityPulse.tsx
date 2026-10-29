import { memo, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { palette, radius } from "../../constants/theme";
import { useLoadingMotion } from "../../hooks/useLoadingMotion";

/** ELAS motion signature: a living city, connected by a shared pulse. */
export const CityPulse = memo(function CityPulse({
  active = true,
  compact = false,
  tone = "brand",
}: {
  active?: boolean;
  compact?: boolean;
  tone?: "brand" | "light";
}) {
  const { phase, moving } = useLoadingMotion(active);
  const [sceneWidth, setSceneWidth] = useState(280);
  const wave = (delay: number) =>
    phase.interpolate({
      inputRange: [0, delay, delay + 0.2, Math.min(delay + 0.4, 1), 1],
      outputRange: [0.3, 0.3, 1, 0.3, 0.3],
    });
  if (compact)
    return (
      <View
        testID="city-pulse-compact"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.compact}
      >
        {[0.08, 0.3, 0.52].map((delay, index) => (
          <Animated.View
            key={delay}
            style={[
              styles.dot,
              index === 1 && styles.accentDot,
              tone === "light" && {
                backgroundColor: index === 1 ? palette.icon : palette.surface,
              },
              {
                opacity: moving ? wave(delay) : 0.8,
                transform: [
                  {
                    scale: moving
                      ? phase.interpolate({
                          inputRange: [0, delay, delay + 0.2, delay + 0.4, 1],
                          outputRange: [0.75, 0.75, 1.15, 0.75, 0.75],
                        })
                      : 1,
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  return (
    <View
      onLayout={(event) =>
        setSceneWidth(Math.min(280, event.nativeEvent.layout.width))
      }
      style={{
        width: "100%",
        maxWidth: 280,
        height: (sceneWidth * 220) / 280,
        alignSelf: "center",
      }}
    >
      <View
        testID="city-pulse-scene"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.scene,
          {
            transform: [{ scale: sceneWidth / 280 }],
            transformOrigin: "top left",
          },
        ]}
      >
        <Svg
          width={280}
          height={220}
          viewBox="0 0 280 220"
          style={StyleSheet.absoluteFill}
        >
          <Circle cx="140" cy="108" r="96" fill={palette.surfaceTint} />
          <Circle
            cx="140"
            cy="108"
            r="72"
            fill="none"
            stroke={palette.border}
            strokeDasharray="3 7"
          />
          <Path
            d="M24 150H71Q87 150 87 134V104Q87 89 103 89H177Q193 89 193 105V152H254M52 182H126Q140 182 140 168V139M218 42V67Q218 78 207 78H183M39 67H67"
            fill="none"
            stroke={palette.border}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M46 150V113Q46 107 52 107H68V150M61 107V95H76V150"
            fill={palette.surface}
            stroke={palette.icon}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M205 151V111H235V151M212 111V98H228V111"
            fill={palette.surface}
            stroke={palette.accentFill}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M54 119H59M54 130H59M215 121H223M215 132H223"
            stroke={palette.border}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path
            d="M94 174V158M85 158Q85 145 94 137Q103 145 103 158Z"
            fill={palette.icon}
          />
          <Rect
            x="167"
            y="168"
            width="23"
            height="15"
            rx="4"
            fill={palette.accentFill}
            opacity="0.2"
          />
          <Circle cx="42" cy="67" r="4" fill={palette.icon} />
          <Circle cx="218" cy="42" r="4" fill={palette.accentFill} />
        </Svg>
        {[0, 1].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.ring,
              index === 1 && styles.outerRing,
              {
                opacity: moving
                  ? phase.interpolate({
                      inputRange: [0, 0.3, 0.75, 1],
                      outputRange: index
                        ? [0, 0.3, 0.12, 0]
                        : [0.45, 0.3, 0.12, 0.45],
                    })
                  : 0.22,
                transform: [
                  {
                    scale: moving
                      ? phase.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: index
                            ? [0.8, 1.08, 1.28]
                            : [0.85, 1.12, 0.85],
                        })
                      : 1,
                  },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: moving
                ? phase.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.16, 0.08, 0.16],
                  })
                : 0.12,
              transform: [
                {
                  scaleX: moving
                    ? phase.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 0.75, 1],
                      })
                    : 1,
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pin,
            {
              transform: [
                {
                  translateY: moving
                    ? phase.interpolate({
                        inputRange: [
                          0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
                        ],
                        outputRange: [
                          0, -1.3, -4.5, -7.7, -9, -7.7, -4.5, -1.3, 0,
                        ],
                      })
                    : 0,
                },
                {
                  rotate: moving
                    ? phase.interpolate({
                        inputRange: [0, 0.25, 0.75, 1],
                        outputRange: ["0deg", "-3deg", "3deg", "0deg"],
                      })
                    : "0deg",
                },
              ],
            },
          ]}
        >
          <Svg width={78} height={98} viewBox="0 0 78 98">
            <Path
              d="M39 4C19 4 4 19 4 39C4 64 39 93 39 93S74 64 74 39C74 19 59 4 39 4Z"
              fill={palette.wine}
            />
            <Path
              d="M39 4C19 4 4 19 4 39C4 54 16 70 27 81C48 66 65 46 65 29C65 19 62 13 57 9C52 6 45 4 39 4Z"
              fill={palette.brand}
            />
            <Circle cx="39" cy="37" r="23" fill={palette.surface} />
            <Path
              d="M39 50C35 45 24 40 26 32C28 25 36 26 39 31C42 26 50 25 52 32C54 40 43 45 39 50Z"
              fill={palette.brand}
            />
            <Circle cx="57" cy="16" r="4" fill={palette.icon} />
          </Svg>
        </Animated.View>
        {moving && (
          <Animated.View
            style={[
              styles.signal,
              {
                opacity: phase.interpolate({
                  inputRange: [0, 0.08, 0.85, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: phase.interpolate({
                      inputRange: [0, 0.25, 0.4, 0.65, 0.8, 1],
                      outputRange: [24, 84, 84, 190, 190, 250],
                    }),
                  },
                  {
                    translateY: phase.interpolate({
                      inputRange: [0, 0.25, 0.4, 0.65, 0.8, 1],
                      outputRange: [147, 147, 86, 86, 149, 149],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        {[
          { x: 80, y: 83, delay: 0.08 },
          { x: 186, y: 145, delay: 0.3 },
          { x: 130, y: 176, delay: 0.52 },
        ].map((node) => (
          <Animated.View
            key={node.x}
            style={[
              styles.node,
              {
                left: node.x,
                top: node.y,
                opacity: moving ? wave(node.delay) : 0.8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  signal: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  scene: { width: 280, height: 220 },
  ring: {
    position: "absolute",
    left: 94,
    top: 62,
    width: 92,
    height: 92,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.brand,
  },
  outerRing: {
    left: 78,
    top: 46,
    width: 124,
    height: 124,
    borderRadius: radius.pill,
    borderColor: palette.accentFill,
  },
  pin: { position: "absolute", left: 101, top: 48 },
  shadow: {
    position: "absolute",
    left: 115,
    top: 149,
    width: 50,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.wine,
  },
  node: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.brand,
    borderColor: palette.surface,
    borderWidth: 3,
  },
  compact: {
    height: 24,
    width: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.brand,
  },
  accentDot: { backgroundColor: palette.accent },
});
