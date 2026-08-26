// src/screens/auth/JoinCrewScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS } from "../../constants/theme";

export default function JoinCrewScreen() {
  const { login } = useAuth();
  const [link, setLink] = useState("");

  const handleJoin = () => {
    console.log("Joining crew with link:", link);
    // Future: Validate link and route to Dashboard
    login();
  };

  return (
    <View style={globalStyles.container}>
      {/* Placeholder for your actual Logo Image */}
      <Text style={styles.logoText}>
        Rel<Text style={styles.logoHighlight}>ay</Text>
      </Text>

      <View style={styles.formContainer}>
        <TextInput
          style={globalStyles.input}
          placeholder="Paste admin link here..."
          placeholderTextColor={COLORS.textMuted}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={globalStyles.primaryButton}
          onPress={handleJoin}
        >
          <Text style={globalStyles.primaryButtonText}>Join a Crew</Text>
        </TouchableOpacity>

        <Text style={globalStyles.subtitle}>Use the link from your admin</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoText: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 60,
  },
  logoHighlight: {
    color: COLORS.primary,
  },
  formContainer: {
    width: "100%",
    alignItems: "center",
  },
});
