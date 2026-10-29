import { PlaceHeader } from "./PlaceHeader";
import { PlaceMedia } from "./PlaceMedia";
import { PlaceActions } from "./PlaceActions";
import { PlaceSources } from "./PlaceSources";
import { usePlaceCardMotion } from "./usePlaceCardMotion";
import { styles } from "./placeStyles";
import { colors } from "../../constants/theme";

import { useCatalog } from "../../features/map/CatalogProvider";
import { PlaceReviewPreview } from "./PlaceReviewPreview";
import { useEffect, useMemo, useState } from "react";
import { Animated, Linking, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Ionicons from "../icons/Ionicon";
import { Place } from "../../constants/places";

import { distanceBetween } from "../../constants/placeCategories";
import { useLocation } from "../../features/map/LocationProvider";

import { TouchFeedback } from "../TouchFeedback";

export function PlaceCard({
  place,
  expanded = false,
  onToggle,
  onReview,
  onClose,
  maxHeight = 440,
}: {
  place: Place | null;
  expanded?: boolean;
  onToggle?: () => void;
  onReview?: (place: Place) => void;
  onClose?: () => void;
  maxHeight?: number;
}) {
  const { userLocation } = useLocation();
  const { ensurePlace } = useCatalog();
  const [linkError, setLinkError] = useState("");
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(Math.max(width - 24, 0), 420);
  const photoWidth = Math.max(cardWidth - 32, 0);
  const { shown, entrance, content, zoom } = usePlaceCardMotion(
    place,
    expanded,
  );
  useEffect(() => {
    setLinkError("");
  }, [shown?.id]);
  const latitude = shown?.latitude,
    longitude = shown?.longitude;
  const distance = useMemo(
    () =>
      userLocation && latitude !== undefined && longitude !== undefined
        ? distanceBetween(userLocation, { latitude, longitude })
        : null,
    [userLocation, latitude, longitude],
  );
  if (!shown || shown.id !== place?.id) return null;
  function open(url: string) {
    void Linking.openURL(url).catch(() =>
      setLinkError("Não foi possível abrir o link."),
    );
  }
  return (
    <Animated.View
      style={[
        styles.card,
        {
          width: cardWidth,
          maxHeight: expanded ? maxHeight : undefined,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            { scale: zoom },
          ],
        },
      ]}
    >
      <View style={styles.handle} />
      <ScrollView
        scrollEnabled={expanded}
        style={expanded ? { flexShrink: 1 } : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Animated.View style={{ opacity: content }}>
          <PlaceHeader place={shown} expanded={expanded} onToggle={onToggle} />
        </Animated.View>
        <PlaceReviewPreview
          key={shown.id}
          placeId={shown.id}
          summary={shown.reviewSummary}
          unavailable={shown.reviewsUnavailable}
          onRefresh={(signal) => ensurePlace(shown.id, signal)}
          expanded={expanded}
          onExpand={() => onToggle?.()}
        />
        {expanded && (
          <>
            <PlaceMedia
              key={shown.id}
              place={shown}
              photoWidth={photoWidth}
              onOpen={open}
            />
            {distance !== null && (
              <Text style={styles.note}>
                Aproximadamente{" "}
                {distance! < 1
                  ? Math.round(distance! * 1000) + " m"
                  : distance!.toFixed(1) + " km"}{" "}
                em linha reta.
              </Text>
            )}
            <PlaceActions place={shown} onOpen={open} />
            <PlaceSources place={shown} onOpen={open} />
            {!!linkError && (
              <Text
                accessibilityRole="alert"
                style={[styles.note, { color: colors.pink }]}
              >
                {linkError}
              </Text>
            )}
          </>
        )}
      </ScrollView>
      {onReview && (
        <TouchFeedback
          label={`Avaliar ${shown.name}`}
          onPress={() => onReview(shown)}
          spring
          style={styles.review}
        >
          <Ionicons name="add-outline" color="white" size={20} />
          <Text style={styles.reviewText}>Avaliar este lugar</Text>
        </TouchFeedback>
      )}
      {onClose && (
        <TouchFeedback
          label="Fechar detalhes do local"
          onPress={onClose}
          style={styles.close}
        >
          <View style={styles.closeBadge}>
            <Ionicons name="close" size={18} color={colors.pink} />
          </View>
        </TouchFeedback>
      )}
    </Animated.View>
  );
}
