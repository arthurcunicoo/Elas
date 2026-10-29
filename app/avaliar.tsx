import { colors } from "../constants/theme";
import { Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { PageHeader } from "../components/shared/PageHeader";
import { ReviewForm } from "../features/reviews/ReviewForm";
import { ReviewPlaceSearch } from "../features/reviews/ReviewPlaceSearch";
export default function Review() {
  const params = useLocalSearchParams<{ placeId?: string }>();
  const placeId =
    typeof params.placeId === "string" && params.placeId.trim()
      ? params.placeId
      : undefined;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <PageHeader
        title="Avalie um lugar"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/mapa")
        }
      />
      {placeId ? (
        <ReviewForm key={placeId} placeId={placeId} />
      ) : (
        <ReviewPlaceSearch
          onSelect={(place) => {
            Keyboard.dismiss();
            router.setParams({ placeId: place.id });
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
