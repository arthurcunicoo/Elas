import { colors, fonts, glass, radius, typography } from "../constants/theme";
import { PageHeader } from "./shared/PageHeader";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import Ionicons from "./icons/Ionicon";

import { MotionReveal } from "./MotionReveal";
import { TouchFeedback } from "./TouchFeedback";
export function ProfileHeader({
  onEdit,
  avatar,
  name = "Nome Sobrenome",
  email = "nomesobrenome@gmail.com",
}: {
  name?: string;
  email?: string;
  onEdit: () => void;
  avatar?: ImageSourcePropType;
}) {
  return (
    <PageHeader title="Perfil">
      <View style={styles.profile}>
        <MotionReveal duration={320} distance={6}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {avatar ? (
                <Image source={avatar} style={styles.photo} />
              ) : (
                <Ionicons name="person" size={38} color={colors.pink} />
              )}
              <TouchFeedback
                label="Alterar foto do perfil"
                onPress={onEdit}
                style={styles.edit}
              >
                <View style={styles.editCircle}>
                  <Ionicons name="create-outline" size={16} color={colors.pink} />
                </View>
              </TouchFeedback>
            </View>
          </View>
        </MotionReveal>
        <MotionReveal duration={320} delay={40} distance={6}>
          <View style={styles.identity}>
            <Text numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            {!!email && (
              <View style={styles.emailPill}>
                <Text numberOfLines={1} style={styles.email}>
                  {email}
                </Text>
              </View>
            )}
          </View>
        </MotionReveal>
      </View>
    </PageHeader>
  );
}
const styles = StyleSheet.create({
  profile: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 34,
  },
  avatarRing: {
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: glass.pill,
    borderWidth: 1,
    borderColor: glass.pillBorder,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: 68, height: 68, borderRadius: radius.pill },
  edit: {
    position: "absolute",
    bottom: -4,
    right: -6,
    width: 36,
    height: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  editCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: glass.surfaceStrong,
    borderWidth: 1,
    borderColor: glass.specularBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.wine,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  identity: {
    alignItems: "center",
    marginTop: 10,
    gap: 5,
  },
  name: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  emailPill: {
    backgroundColor: glass.pill,
    borderWidth: 1,
    borderColor: glass.pillBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  email: {
    color: colors.white,
    fontFamily: fonts.sans,
    fontSize: typography.caption,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
