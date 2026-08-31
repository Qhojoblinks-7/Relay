// src/components/AuthBackground.js
import { View, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

export default function AuthBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.ovalTopLeft} />
      <View style={styles.inclinedBottomRight} />
    </View>
  );
}

const styles = {
  ovalTopLeft: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
  },
  inclinedBottomRight: {
    position: "absolute",
    bottom: -350,
    right: -350,
    width: 500,
    height: 800,
    backgroundColor: COLORS.secondary,
    opacity: 0.4,
    transform: [{ rotate: "45deg" }],
  },
};
