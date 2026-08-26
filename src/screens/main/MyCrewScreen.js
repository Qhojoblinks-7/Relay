// src/screens/main/MyCrewScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { UserPlus, Shield, UserCheck, Circle } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';

const CREW_MEMBERS = [
  { id: '1', name: 'Samuel Addo', role: 'Stage Manager', status: 'online' },
  { id: '2', name: 'Bright Osei', role: 'Main Camera', status: 'online' },
  { id: '3', name: 'Emmanuel Tekyi', role: 'Moving Cam 1', status: 'busy' },
  { id: '4', name: 'Grace Mensah', role: 'Audio Lead', status: 'offline' },
];

export default function MyCrewScreen() {
  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: 'Join our production crew on Relay! Access link: https://relay.app/join/crew-prod-1',
      });
    } catch (error) {
      console.error(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Crew</Text>

      {/* Roster Container */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {CREW_MEMBERS.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
            </View>

            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>

            <View style={styles.statusContainer}>
              <Circle
                size={10}
                color={
                  member.status === 'online'
                    ? '#4CAF50'
                    : member.status === 'busy'
                    ? COLORS.primary
                    : COLORS.textMuted
                }
                fill={
                  member.status === 'online'
                    ? '#4CAF50'
                    : member.status === 'busy'
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />
              <Text style={styles.statusText}>{member.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Invite Share Action */}
      <TouchableOpacity style={styles.inviteButton} onPress={handleShareInvite}>
        <UserPlus color={COLORS.background} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.inviteButtonText}>Share Invite Link</Text>
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
  scrollList: {
    paddingBottom: 20,
  },
  memberCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberRole: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
