// src/screens/auth/JoinCrewScreen.js
import React, { useState, useEffect, useRef } from "react";
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
import AuthHeader from "../../components/AuthHeader";
import AuthBackground from "../../components/AuthBackground";

export default function JoinCrewScreen() {
  const joinCrewAsExistingUser = useAuthStore((state) => state.joinCrewAsExistingUser);
  const user = useAuthStore((state) => state.user);
  const currentCrewId = useAuthStore((state) => state.crewId);
  const authError = useAuthStore((state) => state.authError);
  const route = useRoute();
  const navigation = useNavigation();
  const [link, setLink] = useState(route.params?.prefillLink || route.params?.joinLink || "");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const { crewId, code } = parseInvite(link);

  useEffect(() => {
    if (!crewId && route.params?.joinCrewId && route.params?.joinCode) {
      setLink(`${route.params.joinCrewId} ${route.params.joinCode}`);
    }
  }, [route.params?.joinCrewId, route.params?.joinCode]);

  useEffect(() => {
    if (user && crewId && currentCrewId && crewId === currentCrewId) {
      console.log('[JoinCrew] user already a member of crew, navigating to MainTabs');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [user, crewId, currentCrewId, navigation]);

  useEffect(() => {
    if (link && !crewId) {
      console.error('[JoinCrew] invite link could not be parsed into crewId + code:', { link });
    }
  }, [link, crewId]);

  useEffect(() => {
    setJoinError(null);
  }, [link]);

  const handleJoinExisting = async () => {
    if (!crewId || !code) return;
    setLoading(true);
    setJoinError(null);
    try {
      const hadCrewBefore = !!currentCrewId;
      await joinCrewAsExistingUser({ crewId, code, displayName: displayName || user?.email });
      if (user && hadCrewBefore) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (e) {
      const message = e?.message || 'Something went wrong. Please try again.';
      console.error('[JoinCrew] join failed:', {
        error: e,
        code: e?.code,
        message,
        crewId,
        code,
      });
      if (mountedRef.current) setJoinError(message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleScanned = (data) => {
    if (__DEV__) {
      console.log('[QR] raw scanned data:', data);
    }
    setShowScanner(false);
    const parsed = parseInvite(data);
    const hasCrewId = Boolean(parsed.crewId);
    const hasCode = Boolean(parsed.code);
    if (hasCrewId && hasCode) {
      setLink(parsed.raw || `${parsed.crewId} ${parsed.code}`);
      if (user && parsed.crewId === currentCrewId) {
        console.log('[QR] user already a member of this crew, navigating to MainTabs');
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } else if (hasCode && !hasCrewId) {
      console.warn('[QR] scanned data looks like a raw invite code but no crewId was provided:', parsed.code);
      setLink(parsed.code);
    } else {
      console.error('[QR] scanned data is not a valid invite link or code:', data);
      setLink('');
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
          <AuthBackground />
          <AuthHeader />
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
        <AuthBackground />

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
                autoComplete="name"
                textContentType="name"
                importantForAutofill="yes"
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

          {(joinError || authError) ? (
            <Text style={styles.errorText}>{joinError || authError}</Text>
          ) : null}

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
