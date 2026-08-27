// src/screens/auth/JoinCrewScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { QrCode } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { parseInvite } from "../../lib/invite";
import QRScannerScreen from "../../components/QRScannerScreen";
import { globalStyles } from "../../constants/globalStyles";
import { COLORS } from "../../constants/theme";

export default function JoinCrewScreen() {
  const { joinCrew, authError } = useAuth();
  const route = useRoute();
  const [link, setLink] = useState(route.params?.prefillLink || "");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const { crewId, code } = parseInvite(link);

  const handleJoin = async () => {
    if (!crewId || !code || !displayName || !email || !password) return;
    setLoading(true);
    try {
      await joinCrew({ email, password, displayName, crewId, code });
    } catch (e) {
      // authError is surfaced from context
    } finally {
      setLoading(false);
    }
  };

  const handleScanned = (data) => {
    setShowScanner(false);
    const parsed = parseInvite(data);
    if (parsed.crewId || parsed.code) {
      // Scanned an invite payload — prefill the form.
      setLink(parsed.raw || `${parsed.crewId} ${parsed.code}`);
    } else {
      setLink(data);
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

        {crewId ? (
          <Text style={styles.detectedText}>
            Joining crew: {crewId} · code {code}
          </Text>
        ) : null}

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
          onPress={handleJoin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Join a Crew</Text>
          )}
        </TouchableOpacity>

        <Text style={globalStyles.subtitle}>Use the link from your admin</Text>
      </View>

      <QRScannerScreen
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleScanned}
      />
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
});
