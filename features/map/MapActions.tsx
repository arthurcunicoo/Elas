import { Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { colors } from "../../constants/theme";
import { styles } from "./mapStyles";
export function MapActions({
  onImpacts,
  onList,
}: {
  onImpacts: () => void;
  onList: () => void;
}) {
  return (
    <>
      <TouchFeedback
        label="Ver impactos"
        onPress={onImpacts}
        style={styles.impacts}
      >
        <View style={styles.impactContent}>
          <Ionicons name="business-outline" size={29} color={colors.white} />
          <Text style={styles.impactText}>Ver impactos</Text>
        </View>
      </TouchFeedback>
      <TouchFeedback
        label="Ver lugares em lista"
        onPress={onList}
        style={styles.listButton}
      >
        <Ionicons name="list" size={24} color={colors.pink} />
      </TouchFeedback>
    </>
  );
}
