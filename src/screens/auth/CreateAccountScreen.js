// src/screens/auth/CreateAccountScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS } from "../../constants/theme";

export default function CreateAccountScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleCreate = () => {
    console.log("Creating account for:", email);
    // Future: Connect to Firebase/Supabase auth
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
          placeholder="Enter email..."
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Create password"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={globalStyles.primaryButton}
          onPress={handleCreate}
        >
          <Text style={globalStyles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={globalStyles.subtitle}>
          Start fresh, Build your Team{"\n"}and manage access
        </Text>
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
