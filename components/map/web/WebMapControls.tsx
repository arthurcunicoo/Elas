import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { glassPanel, palette, radius } from "../../../constants/theme";
import { TouchFeedback } from "../../TouchFeedback";
import Ionicons from "../../icons/Ionicon";
export function WebMapControls({
  top,
  zoom,
  maxZoom,
  changeZoom,
  pan,
}: {
  top: number;
  zoom: number;
  maxZoom: number;
  changeZoom: (delta: number) => void;
  pan: (dx: number, dy: number) => void;
}) {
  const [panControls, setPanControls] = useState(false);
  return (
    <View pointerEvents="box-none" style={[styles.controls, { top: top }]}>
      <TouchFeedback
        label="Ampliar mapa"
        onPress={() => changeZoom(1)}
        disabled={zoom === maxZoom}
        style={styles.control}
      >
        <Ionicons name="add" size={21} color={palette.text} />
      </TouchFeedback>
      <TouchFeedback
        label="Reduzir mapa"
        onPress={() => changeZoom(-1)}
        disabled={zoom === 10}
        style={styles.control}
      >
        <Ionicons name="remove" size={21} color={palette.text} />
      </TouchFeedback>
      <TouchFeedback
        label={
          panControls
            ? "Recolher controles de movimento"
            : "Mostrar controles de movimento"
        }
        onPress={() => setPanControls((v) => !v)}
        style={styles.control}
      >
        <Ionicons name="move-outline" size={19} color={palette.text} />
      </TouchFeedback>
      {panControls && (
        <>
          <View style={styles.controlRow}>
            <TouchFeedback
              label="Mover mapa para norte"
              onPress={() => pan(0, -1)}
              style={styles.control}
            >
              <Ionicons name="chevron-up" size={21} color={palette.text} />
            </TouchFeedback>
            <TouchFeedback
              label="Fechar controles de movimento"
              onPress={() => setPanControls(false)}
              style={styles.control}
            >
              <Ionicons name="close" size={19} color={palette.text} />
            </TouchFeedback>
          </View>
          <View style={styles.controlRow}>
            <TouchFeedback
              label="Mover mapa para oeste"
              onPress={() => pan(-1, 0)}
              style={styles.control}
            >
              <Ionicons name="chevron-back" size={21} color={palette.text} />
            </TouchFeedback>
            <TouchFeedback
              label="Mover mapa para leste"
              onPress={() => pan(1, 0)}
              style={styles.control}
            >
              <Ionicons name="chevron-forward" size={21} color={palette.text} />
            </TouchFeedback>
          </View>
          <View style={styles.controlRow}>
            <TouchFeedback
              label="Mover mapa para sul"
              onPress={() => pan(0, 1)}
              style={styles.control}
            >
              <Ionicons name="chevron-down" size={21} color={palette.text} />
            </TouchFeedback>
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  controls: {
    position: "absolute",
    right: 12,
    gap: 5,
    alignItems: "flex-end",
    zIndex: 7,
  },
  controlRow: { flexDirection: "row", gap: 4 },
  control: {
    width: 44,
    height: 44,
    minHeight: 44,
    flexShrink: 0,
    ...glassPanel,
    borderRadius: radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
});
