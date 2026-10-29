import { Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { colors } from "../../constants/theme";
import { styles } from "./mapStyles";
import { router } from "expo-router";
import type { Report } from "../../services/reports";
export function SelectedReport({
  report,
  maxHeight,
  onHeight,
  onClose,
}: {
  report: Report;
  maxHeight: number;
  onHeight: (height: number) => void;
  onClose: () => void;
}) {
  return (
    <View
      onLayout={(e) => onHeight(Math.round(e.nativeEvent.layout.height))}
      style={[styles.reportCard, { maxHeight: maxHeight }]}
    >
      <Text style={styles.reportTitle}>{report.categoria}</Text>
      <Text style={styles.reportPlace}>{report.local_texto}</Text>
      <Text style={styles.reportBody} numberOfLines={5}>
        {report.descricao}
      </Text>
      <Text style={styles.reportStatus}>
        {report.status === "pendente"
          ? "Seu relato · aguardando verificação"
          : "Relato verificado"}{" "}
        · {new Date(report.criado_em).toLocaleDateString("pt-BR")}
      </Text>
      <TouchFeedback
        label="Ler relato completo"
        onPress={() =>
          router.push({
            pathname: "/registro",
            params: {
              kind: "relato",
              id: report.id,
            },
          })
        }
      >
        <Text style={styles.resultText}>Ler relato completo</Text>
      </TouchFeedback>
      <TouchFeedback
        label="Fechar relato"
        onPress={onClose}
        style={styles.close}
      >
        <Ionicons name="close" color={colors.wine} size={23} />
      </TouchFeedback>
    </View>
  );
}
