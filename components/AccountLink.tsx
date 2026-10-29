import { colors, typography } from "../constants/theme";
import { StyleSheet, Text } from "react-native";
import { TouchFeedback } from "./TouchFeedback";
import { router } from "expo-router";
import { completeOnboarding } from "../features/map/onboardingEvent";

export function AccountLink({
  registration = false,
}: {
  registration?: boolean;
}) {
  return (
    <TouchFeedback
      role="link"
      label={registration ? "Faça login" : "Cadastrar"}
      onPress={() => {
        completeOnboarding();
        if (registration) router.replace("/login");
        else router.push("/cadastro");
      }}
      style={styles.touch}
    >
      <Text style={styles.text}>
        {registration ? "Já possui uma conta? " : "Não possui conta? "}
        <Text style={styles.link}>
          {registration ? "Faça login" : "Cadastrar"}
        </Text>
      </Text>
    </TouchFeedback>
  );
}
const styles = StyleSheet.create({
  touch: {
    minHeight: 42,
    marginVertical: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: colors.white,
    fontSize: typography.secondary,
    fontWeight: "600",
    textAlign: "center",
  },
  link: { fontWeight: "800", textDecorationLine: "underline" },
});
