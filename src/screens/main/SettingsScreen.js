// src/screens/main/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SlidersHorizontal, Volume2, LogOut, Shield } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useWebRTC } from '../../context/WebRTCContext';
import { useAuth } from '../../context/AuthContext';

export default function SettingsScreen() {
  const { isNoiseCancellationActive, toggleNoiseCancellation } = useWebRTC();
  const { logout } = useAuth();
  const [highQualityAudio, setHighQualityAudio] = useState(true);
  const [pttBeep, setPttBeep] = useState(true);

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
        <Text style={styles.subtext}>Logged in as: Admin Operator</Text>
        <Text style={styles.subtext}>Crew ID: PRD-ACC-2026</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
