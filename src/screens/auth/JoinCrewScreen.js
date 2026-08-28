// src/screens/auth/JoinCrewScreen.js
import React, { useState, useEffect } from "react";
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
import { useRoute, useNavigation } from "@react-navigation/native";
import { QrCode } from "lucide-react-native";
import useAuthStore from "../../stores/authStore";
import { parseInvite } from "../../lib/invite";
import QRScannerScreen from "../../components/QRScannerScreen";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS, SIZES } from "../../constants/theme";

export default function JoinCrewScreen() {
  const joinCrewAsExistingUser = useAuthStore((state) => state.joinCrewAsExistingUser);
  const user = useAuthStore((state) => state.user);
  const authError = useAuthStore((state) => state.authError);
  const route = useRoute();
  const navigation = useNavigation();
  const [link, setLink] = useState(route.params?.prefillLink || route.params?.joinLink || "");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const { crewId, code } = parseInvite(link);

  useEffect(() => {
    if (!crewId && route.params?.joinCrewId && route.params?.joinCode) {
      setLink(`${route.params.joinCrewId} ${route.params.joinCode}`);
    }
  }, [route.params?.joinCrewId, route.params?.joinCode]);

  const handleJoinExisting = async () => {
    if (!crewId || !code) return;
    setLoading(true);
    try {
      await joinCrewAsExistingUser({ crewId, code, displayName: displayName || user?.email });
    } catch (e) {
      // authError surfaced from context
    } finally {
      setLoading(false);
    }
  };

  const handleScanned = (data) => {
    setShowScanner(false);
    const parsed = parseInvite(data);
    if (parsed.crewId || parsed.code) {
      setLink(parsed.raw || `${parsed.crewId} ${parsed.code}`);
    } else {
      setLink(data);
    }
  };

  if (!crewId || !code) {
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
              placeholder="Paste invite link or code..."
              placeholderTextColor={COLORS.textMuted}
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
            >
              <QrCode color={COLORS.primary} size={18} style={{ marginRight: 8 }} />
              <Text style={styles.scanButtonText}>Scan invite QR</Text>
            </TouchableOpacity>
          </View>

          <QRScannerScreen
            visible={showScanner}
            onClose={() => setShowScanner(false)}
            onScanned={handleScanned}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <Text style={styles.detectedText}>
            Joining crew: {crewId} · code {code}
          </Text>

          {user ? (
            <>
              <TextInput
                style={globalStyles.input}
                placeholder="Your name..."
                placeholderTextColor={COLORS.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[globalStyles.primaryButton, loading && styles.disabled]}
                onPress={handleJoinExisting}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.background} />
                ) : (
                  <Text style={globalStyles.primaryButtonText}>Join Crew</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[globalStyles.primaryButton, loading && styles.disabled]}
                onPress={() => navigation.navigate('SignIn', { joinCrewId: crewId, joinCode: code })}
                disabled={loading}
              >
                <Text style={globalStyles.primaryButtonText}>Sign In to Join</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, loading && styles.disabled]}
                onPress={() => navigation.navigate('CreateAccount', { joinCrewId: crewId, joinCode: code })}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Create Account & Join</Text>
              </TouchableOpacity>
            </>
          )}

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          <Text style={globalStyles.subtitle}>Use the link from your admin</Text>
        </View>

        <QRScannerScreen
          visible={showScanner}
          onClose={() => setShowScanner(false)}
          onScanned={handleScanned}
        />
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
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  scanButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  detectedText: {
    color: COLORS.primary,
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
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
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});
