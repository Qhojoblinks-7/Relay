// src/constants/globalStyles.js
import { StyleSheet } from "react-native";
import { COLORS, SIZES } from "./theme";

export const globalStyles = StyleSheet.create({
  // Layouts
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
    justifyContent: "center",
    alignItems: "center",
  },

  // Typography
  title: {
    color: COLORS.text,
    fontSize: SIZES.extraLarge,
    fontWeight: "bold",
    marginBottom: SIZES.medium,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: SIZES.font,
    marginBottom: SIZES.padding,
    textAlign: "center",
  },

  // Buttons (Mapping to your Relay Connect theme)
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: SIZES.radius,
    width: "100%",
    alignItems: "center",
    marginBottom: SIZES.medium,
  },
  primaryButtonText: {
    color: COLORS.background, // Black text on the orange button looks sharp
    fontSize: SIZES.medium,
    fontWeight: "bold",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: SIZES.radius,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    width: "100%",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: SIZES.font,
    fontWeight: "bold",
  },

  // Input Fields
  input: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderColor: COLORS.secondary,
    borderWidth: 2,
    borderRadius: SIZES.radius,
    color: COLORS.text,
    padding: 16,
    fontSize: SIZES.medium,
    marginBottom: SIZES.medium,
  },
});
