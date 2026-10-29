import { LoadingIndicator } from "../../components/loading/LoadingIndicator";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Ionicons from "../../components/icons/Ionicon";
import { TouchFeedback } from "../../components/TouchFeedback";
import { colors, glass, palette } from "../../constants/theme";
import { styles } from "./mapStyles";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { CategoryId, placeCategories } from "../../constants/placeCategories";
import { MotionReveal } from "../../components/MotionReveal";
type Props = {
  query: string;
  focused: boolean;
  locating: boolean;
  hasLocation: boolean;
  showScopes: boolean;
  scope: "area" | "catalog";
  filter: CategoryId;
  top: number;
  children: ReactNode;
  onHeight: (height: number) => void;
  onQueryChange: (query: string) => void;
  onFocus: () => void;
  onSubmit: () => void;
  onFilters: () => void;
  onLocate: () => void;
  onScopeChange: (scope: "area" | "catalog") => void;
  onFilterChange: (category: CategoryId) => void;
};
export function MapSearch({
  query,
  focused,
  locating,
  hasLocation,
  showScopes,
  scope,
  filter,
  top,
  children,
  onHeight,
  onQueryChange,
  onFocus,
  onSubmit,
  onFilters,
  onLocate,
  onScopeChange,
  onFilterChange,
}: Props) {
  const stripRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const stripWidth = useRef(0);
  const contentWidth = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const updateScrollState = useCallback((x: number) => {
    scrollX.current = Math.max(0, x);
    setCanScrollLeft(scrollX.current > 8);
  }, []);

  const scrollCategories = useCallback(
    (direction: -1 | 1) => {
      const maxScroll = Math.max(0, contentWidth.current - stripWidth.current);
      let nextX = scrollX.current + direction * 210;
      if (direction === 1 && maxScroll > 0 && scrollX.current >= maxScroll - 12) {
        nextX = 0;
      } else if (maxScroll > 0) {
        nextX = Math.max(0, Math.min(maxScroll, nextX));
      } else {
        nextX = Math.max(0, nextX);
      }
      updateScrollState(nextX);
      stripRef.current?.scrollTo({ x: nextX, animated: true });
    },
    [updateScrollState],
  );

  return (
    <View pointerEvents="box-none" style={[styles.searchArea, { top: top }]}>
      <View onLayout={(e) => onHeight(Math.round(e.nativeEvent.layout.height))}>
        <MotionReveal duration={300} distance={-8}>
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, focused && styles.focused]}>
              <View style={styles.searchIconBadge}>
                <Ionicons name="search" size={18} color={colors.pink} />
              </View>
              <TextInput
                testID="map-search"
                accessibilityLabel="Buscar um lugar"
                placeholder="Buscar um lugar na cidade..."
                placeholderTextColor={palette.muted}
                value={query}
                onChangeText={onQueryChange}
                onFocus={onFocus}
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={onSubmit}
                underlineColorAndroid="transparent"
                style={[styles.input, Platform.OS === "web" && styles.webInput]}
              />
            </View>
            <TouchFeedback
              label="Abrir filtros"
              onPress={onFilters}
              style={styles.filter}
            >
              <Ionicons name="options-outline" size={24} color={colors.wine} />
            </TouchFeedback>
            <TouchFeedback
              testID="map-locate"
              label="Minha localização"
              busy={locating}
              disabled={locating}
              onPress={onLocate}
              style={styles.filter}
            >
              {locating ? (
                <LoadingIndicator />
              ) : (
                <Ionicons
                  name="locate-outline"
                  size={23}
                  color={hasLocation ? colors.pink : colors.wine}
                />
              )}
            </TouchFeedback>
          </View>
        </MotionReveal>
        {showScopes ? (
          <View style={styles.scopeRow}>
            {(["area", "catalog"] as const).map((s) => (
              <TouchFeedback
                key={s}
                label={
                  s === "area"
                    ? "Buscar na área visível"
                    : "Buscar entre os lugares cadastrados"
                }
                selected={scope === s}
                onPress={() => onScopeChange(s)}
                style={[styles.scopeButton, scope === s && styles.activeScope]}
              >
                <Text
                  style={[
                    styles.scopeText,
                    scope === s && { color: colors.pink, fontWeight: "700" },
                  ]}
                >
                  {s === "area" ? "Nesta área" : "Lugares cadastrados"}
                </Text>
              </TouchFeedback>
            ))}
          </View>
        ) : (
          <View pointerEvents="box-none" style={styles.categoryOuter}>
            <View
              testID="category-strip-viewport"
              onLayout={(e) => {
                stripWidth.current = e.nativeEvent.layout.width;
              }}
              style={styles.categoryViewport}
            >
              <ScrollView
                ref={stripRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onContentSizeChange={(w) => {
                  contentWidth.current = w;
                }}
                onScroll={(e) => {
                  updateScrollState(e.nativeEvent.contentOffset.x);
                }}
                contentContainerStyle={styles.categoryStrip}
              >
                {placeCategories.map((c) => {
                  const active = filter === c.id;
                  return (
                    <TouchFeedback
                      key={c.id}
                      label={`Filtrar ${c.label}`}
                      selected={active}
                      onPress={() => onFilterChange(c.id)}
                      style={[
                        styles.categoryChip,
                        active && styles.selectedChip,
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryChipIcon,
                          {
                            backgroundColor: active ? glass.pill : c.tint,
                          },
                        ]}
                      >
                        <Ionicons
                          name={c.icon}
                          size={15}
                          color={active ? colors.white : c.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.chipText,
                          active && { color: colors.white, fontWeight: "700" },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchFeedback>
                  );
                })}
              </ScrollView>
            </View>
            {canScrollLeft && (
              <View pointerEvents="box-none" style={styles.categoryLeftWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver categorias anteriores"
                  onPress={() => scrollCategories(-1)}
                  style={styles.categoryArrowLeft}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={colors.pink}
                  />
                </Pressable>
              </View>
            )}
            <View pointerEvents="box-none" style={styles.categoryFadeWrap}>
              <View pointerEvents="none" style={styles.categoryFadeSoft} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver mais categorias"
                onPress={() => scrollCategories(1)}
                style={styles.categoryFadeStrong}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.pink}
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}
