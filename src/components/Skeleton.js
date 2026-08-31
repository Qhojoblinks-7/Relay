// src/components/Skeleton.js
import { View } from "react-native";
import { COLORS, SIZES } from "../constants/theme";

export function SkeletonCard({ width = "100%", height = 80 }) {
  return <View style={[styles.card, { width, height }]} />;
}

export function SkeletonMemberCard() {
  return (
    <View style={styles.memberCard}>
      <View style={styles.avatar} />
      <View style={styles.textBlock} />
    </View>
  );
}

export function SkeletonList({ count = 4, type = "channel" }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) =>
        type === "channel" ? <SkeletonCard key={i} /> : <SkeletonMemberCard key={i} />
      )}
    </View>
  );
}

const styles = {
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
  },
};
