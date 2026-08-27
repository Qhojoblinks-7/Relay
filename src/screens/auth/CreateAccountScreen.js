// src/screens/auth/CreateAccountScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS } from "../../constants/theme";

export default function CreateAccountScreen() {
  const { signUp, authError } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [crewName, setCrewName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!displayName || !crewName || !email || !password) return;
    setLoading(true);
    try {
      await signUp({ email, password, displayName, crewName });
    } catch (e) {
      // authError is surfaced from context
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Text style={styles.logoText}>
        Rel<Text style={styles.logoHighlight}>ay</Text>
      </Text>

      <View style={styles.formContainer}>
        <TextInput
          style={globalStyles.input}
          placeholder="Your name..."
          placeholderTextColor={COLORS.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />

        <TextInput
          style={globalStyles.input}
          placeholder="Crew name (e.g. Stage Ops)"
          placeholderTextColor={COLORS.textMuted}
          value={crewName}
          onChangeText={setCrewName}
          autoCapitalize="words"
        />

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

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity
          style={[globalStyles.primaryButton, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Create Account</Text>
          )}
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
    marginBottom: 40,
  },
  logoHighlight: {
    color: COLORS.primary,
  },
  formContainer: {
    width: "100%",
    alignItems: "center",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.6,
  },
});
