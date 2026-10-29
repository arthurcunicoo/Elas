import { palette, typography } from "../../constants/theme";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { useSession } from "../auth/SessionProvider";
import { friendlyError } from "../../lib/supabase";
import { isFavorite, setFavorite } from "./favorites";
export function FavoriteButton({ placeId }: { placeId: string }) {
  const { session } = useSession(),
    id = session?.user.id,
    key = `${id}:${placeId}`,
    current = useRef(key);
  current.current = key;
  const [favorite, setValue] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    setValue(false);
    setError("");
    setBusy(true);
    if (!id) {
      setBusy(false);
      return;
    }
    void isFavorite(placeId)
      .then((value) => {
        if (active) setValue(value);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id, placeId]);
  async function toggle() {
    if (!id || busy || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await setFavorite(id, placeId, !favorite);
      if (current.current === key) setValue(!favorite);
    } catch (e) {
      if (current.current === key) setError(friendlyError(e));
    } finally {
      lock.current = false;
      if (current.current === key) setBusy(false);
    }
  }
  return (
    <View>
      <TouchFeedback
        label={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
        disabled={!id || busy}
        busy={busy}
        selected={favorite}
        onPress={() => void toggle()}
        style={{
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons
          name={favorite ? "heart" : "heart-outline"}
          color={palette.brand}
          size={21}
        />
        <Text
          style={{ color: palette.brand, fontWeight: "600", flexShrink: 1 }}
        >
          {favorite ? "Salvo nos favoritos" : "Salvar lugar"}
        </Text>
      </TouchFeedback>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: palette.error, fontSize: typography.caption }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
