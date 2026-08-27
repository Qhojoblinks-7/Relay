// src/screens/auth/CreateAccountScreen.js
import React, { useState, useRef } from "react";
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
import { useAuth } from "../../context/AuthContext";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS, SIZES } from "../../constants/theme";

export default function CreateAccountScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signUp, signUpOnly, joinCrewAsExistingUser, authError, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [crewName, setCrewName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingNav = useRef(null);

  const joinCrewId = route.params?.joinCrewId;
  const joinCode = route.params?.joinCode;

  useEffect(() => {
    if (!authLoading && pendingNav.current) {
      const target = pendingNav.current;
      pendingNav.current = null;
      navigation.reset({
        index: 0,
        routes: [target],
      });
    }
  }, [authLoading, navigation]);

  const handleCreate = async () => {
    if (!displayName || !email || !password) return;
    setLoading(true);
    try {
      if (joinCrewId && joinCode) {
        await signUpOnly({ email, password, displayName });
        await joinCrewAsExistingUser({ crewId: joinCrewId, code: joinCode, displayName });
        pendingNav.current = { name: 'MainTabs' };
      } else {
        await signUp({ email, password, displayName, crewName: crewName || "My Crew" });
        pendingNav.current = { name: 'MainTabs' };
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
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
