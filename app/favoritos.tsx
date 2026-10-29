import { CollectionState } from "../components/shared/CollectionState";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { FeaturePage, Message, shared } from "../components/shared/FeaturePage";
import { TouchFeedback } from "../components/TouchFeedback";
import { usePagedList } from "../features/profile/usePagedList";
import { listFavorites } from "../features/profile/favorites";
import { placeTypeLabel } from "../constants/placeCategories";
export default function Favorites() {
  const list = usePagedList(listFavorites);
  return (
    <FeaturePage title="Meus favoritos" scroll={false}>
      <Message text={list.rows.length ? list.error : ""} error />
      <FlatList
        data={list.rows}
        keyExtractor={(row) => row.id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshing={list.loading}
        onRefresh={list.refresh}
        onEndReached={list.more}
        contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 2 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <CollectionState
            loading={list.loading}
            error={list.error}
            title="Seus lugares favoritos"
            message="Salve lugares no mapa para encontrá-los aqui."
            skeleton="places"
            onRetry={list.refresh}
          />
        }

        renderItem={({ item }) => (
          <TouchFeedback
            label={`Ver ${item.name} no mapa`}
            onPress={() =>
              router.navigate({
                pathname: "/mapa",
                params: { placeId: item.id, reportId: "" },
              })
            }
            style={shared.card}
          >
            <Text style={shared.title}>{item.name}</Text>
            <Text style={shared.note}>
              {placeTypeLabel(item)} · {item.address}
            </Text>
          </TouchFeedback>
        )}
      />
    </FeaturePage>
  );
}
