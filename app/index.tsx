import { router } from "expo-router";
import { WelcomeOnboarding } from "../components/OnboardingTour";
import { completeOnboarding } from "../features/map/onboardingEvent";

export default function Welcome() {
  return (
    <WelcomeOnboarding
      onContinue={() => {
        completeOnboarding();
        router.push("/login");
      }}
      onRegister={() => {
        completeOnboarding();
        router.push("/cadastro");
      }}
    />
  );
}
