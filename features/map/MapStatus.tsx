import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { colors } from "../../constants/theme";
import { styles } from "./mapStyles";
export function MapStatus({
  opening,
  mapState,
  notice,
  failure,
  onNotice,
}: {
  opening: boolean;
  mapState: "loading" | "ready" | "error";
  notice: string;
  failure: string;
  onNotice: () => void;
}) {
  return (
    <View pointerEvents="box-none" style={styles.feedback}>
      {!opening && mapState === "loading" && (
        <View accessibilityLiveRegion="polite" style={styles.loadingChip}>
          <LoadingIndicator />
          <Text style={styles.loadingText}>Carregando mapa</Text>
        </View>
      )}
      {!!notice && mapState !== "loading" && (
        <TouchFeedback
          label={
            failure
              ? "Ver aviso do mapa"
              : "Ver informações sobre os lugares desta área"
          }
          onPress={onNotice}
          style={styles.noticeButton}
        >
          <Ionicons
            name={
              failure ? "alert-circle-outline" : "information-circle-outline"
            }
            size={18}
            color={colors.pink}
          />
          <Text style={styles.noticeText}>
            {failure ? "Ver aviso" : "Sobre a área"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.pink} />
        </TouchFeedback>
      )}
    </View>
  );
}
