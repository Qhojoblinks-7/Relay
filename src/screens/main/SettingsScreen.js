// src/screens/main/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SlidersHorizontal, Volume2, LogOut, Shield } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useWebRTC } from '../../context/WebRTCContext';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function SettingsScreen() {
  const { isNoiseCancellationActive, toggleNoiseCancellation, disconnect } = useWebRTC();
  const { logout, profile, crew, crewRole, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [pttBeep, setPttBeep] = useState(true);

  const handleLogout = async () => {
    disconnect();
    await logout();
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
