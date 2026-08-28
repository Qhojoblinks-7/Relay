// src/screens/main/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SlidersHorizontal, Volume2, LogOut, Shield, Speaker } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import useWebRTCStore from '../../stores/webrtcStore';
import useAuthStore from '../../stores/authStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function SettingsScreen() {
  const isNoiseCancellationActive = useWebRTCStore((state) => state.isNoiseCancellationActive);
  const toggleNoiseCancellation = useWebRTCStore((state) => state.toggleNoiseCancellation);
  const isSpeakerphone = useWebRTCStore((state) => state.isSpeakerphone);
  const toggleSpeakerphone = useWebRTCStore((state) => state.toggleSpeakerphone);
  const disconnect = useWebRTCStore((state) => state.disconnect);
  const logOut = useAuthStore((state) => state.logOut);
  const profile = useAuthStore((state) => state.profile);
  const crew = useAuthStore((state) => state.crew);
  const crewRole = useAuthStore((state) => state.crewRole);
  const user = useAuthStore((state) => state.user);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [pttBeep, setPttBeep] = useState(true);

  const handleLogout = async () => {
    await disconnect();
    await logOut();
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
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
        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.section}>
        <Text style={styles.sectionHeader}>Audio Controls</Text>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <SlidersHorizontal color={COLORS.primary} size={20} />
            <Text style={styles.rowText}>AI Noise Cancellation</Text>
          </View>
          <Switch
            value={isNoiseCancellationActive}
            onValueChange={toggleNoiseCancellation}
            trackColor={{ false: COLORS.secondary, true: COLORS.primary }}
            thumbColor={COLORS.text}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Volume2 color={COLORS.primary} size={20} />
            <Text style={styles.rowText}>PTT Sound Cue</Text>
          </View>
          <Switch
            value={pttBeep}
            onValueChange={setPttBeep}
            trackColor={{ false: COLORS.secondary, true: COLORS.primary }}
            thumbColor={COLORS.text}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Speaker color={COLORS.primary} size={20} />
            <Text style={styles.rowText}>Speakerphone</Text>
          </View>
          <Switch
            value={isSpeakerphone}
            onValueChange={toggleSpeakerphone}
            trackColor={{ false: COLORS.secondary, true: COLORS.primary }}
            thumbColor={COLORS.text}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account & Crew</Text>
        <TextInput
          style={styles.profileInput}
          placeholder="Display name"
          placeholderTextColor={COLORS.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
        <Text style={styles.subtext}>Email: {user?.email || "—"}</Text>
        <Text style={styles.subtext}>Crew: {crew?.name || "—"}</Text>
        <Text style={styles.subtext}>Role: {crewRole || "none"}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut color="#FF4D4D" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Leave Crew / Log Out</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: SIZES.extraLarge,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    color: COLORS.text,
    fontSize: 16,
  },
  subtext: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 6,
  },
  profileInput: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.secondary,
    borderWidth: 2,
    borderRadius: SIZES.radius,
    color: COLORS.text,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FF4D4D',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#FF4D4D',
    fontWeight: 'bold',
  },
});
