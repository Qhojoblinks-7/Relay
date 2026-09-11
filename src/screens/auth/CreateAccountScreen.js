// src/screens/auth/CreateAccountScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Eye, EyeOff } from "lucide-react-native";
import useAuthStore from "../../stores/authStore";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS, SIZES } from "../../constants/theme";
import AuthHeader from "../../components/AuthHeader";
import AuthBackground from "../../components/AuthBackground";

export default function CreateAccountScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const signUp = useAuthStore((state) => state.signUp);
  const signUpOnly = useAuthStore((state) => state.signUpOnly);
  const joinCrewAsExistingUser = useAuthStore((state) => state.joinCrewAsExistingUser);
  const authError = useAuthStore((state) => state.authError);
  const [displayName, setDisplayName] = useState("");
  const [crewName, setCrewName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const joinCrewId = route.params?.joinCrewId;
  const joinCode = route.params?.joinCode;

  const handleCreate = async () => {
    if (!displayName || !email || !password) return;
    setLoading(true);
    try {
      if (joinCrewId && joinCode) {
        await signUpOnly({ email, password, displayName });
        await joinCrewAsExistingUser({ crewId: joinCrewId, code: joinCode, displayName });
      } else {
        await signUp({ email, password, displayName, crewName: crewName || "My Crew" });
      }
    } catch (e) {
      // authError surfaced from context
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <AuthBackground />
        <AuthHeader />
        <View style={styles.formContainer}>
          <TextInput
            style={globalStyles.input}
            placeholder="Your name..."
            placeholderTextColor={COLORS.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            importantForAutofill="yes"
          />

          {!joinCrewId && !joinCode && (
            <TextInput
              style={globalStyles.input}
              placeholder="Crew name (e.g. Stage Ops)"
              placeholderTextColor={COLORS.textMuted}
              value={crewName}
              onChangeText={setCrewName}
              autoCapitalize="words"
              autoComplete="off"
              importantForAutofill="no"
            />
          )}

          <TextInput
            style={globalStyles.input}
            placeholder="Enter email..."
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              style={[globalStyles.input, styles.passwordInput]}
              placeholder="Create password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              importantForAutofill="yes"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
            </TouchableOpacity>
          </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
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
  passwordWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: SIZES.medium,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
  },
});
