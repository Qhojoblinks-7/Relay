// src/screens/main/MyCrewScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { UserPlus, UserMinus, Circle, RefreshCw, QrCode } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import useAuthStore from '../../stores/authStore';
import { buildInviteLink, generateInviteCode } from '../../lib/invite';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AddMemberBottomSheet from '../../components/AddMemberBottomSheet';
import QRCodeModal from '../../components/QRCodeModal';
import { SkeletonList } from '../../components/Skeleton';

function presenceColor(presence) {
  if (presence === 'busy') return COLORS.primary;
  if (presence === 'online') return '#4CAF50';
  return COLORS.textMuted;
}

function presenceLabel(presence) {
  if (presence === 'busy') return 'transmitting';
  if (presence === 'online') return 'online';
  return 'offline';
}

export default function MyCrewScreen() {
  const crew = useAuthStore((state) => state.crew);
  const crewId = useAuthStore((state) => state.crewId);
  const crewRole = useAuthStore((state) => state.crewRole);
  const user = useAuthStore((state) => state.user);
  const signUpOnly = useAuthStore((state) => state.signUpOnly);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Live crew roster (incl. presence) from Firestore.
  useEffect(() => {
    if (!crewId) return;
    const unsub = onSnapshot(
      collection(db, 'crews', crewId, 'members'),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return unsub;
  }, [crewId]);

  // Live channel list for assigning new members.
  useEffect(() => {
    if (!crewId) return;
    const unsub = onSnapshot(
      collection(db, 'crews', crewId, 'channels'),
      (snap) => {
        setChannels(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
      }
    );
    return unsub;
  }, [crewId]);

  // Only crew owners/admins may manage the crew (invite, add, remove, rotate).
  const isAdmin = crewRole === 'owner' || crewRole === 'admin';

  const transmitting = members.filter((m) => m.presence === 'busy');

  const handleAddMember = async ({ name, channelIds }) => {
    if (!name?.trim() || !crewId || !user) return;
    const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@relay.crew`;
    const password = Math.random().toString(36).slice(-8);

    try {
      const { uid } = await signUpOnly({ email, password, displayName: name.trim() });

      await setDoc(doc(db, 'users', uid), {
        displayName: name.trim(),
        email,
        crewId,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'member',
        displayName: name.trim(),
        joinedAt: serverTimestamp(),
      });

      const targetChannelIds = Array.isArray(channelIds) && channelIds.length > 0
        ? channelIds
        : (await getDocs(collection(db, 'crews', crewId, 'channels'))).docs.map((d) => d.id);

      for (const chId of targetChannelIds) {
        await setDoc(doc(db, 'crews', crewId, 'channels', chId, 'members', uid), {
          role: 'member',
          joinedAt: serverTimestamp(),
        });
      }

      Alert.alert('Member Added', `Credentials for ${name}:\nEmail: ${email}\nPassword: ${password}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleShareInvite = async (code) => {
    if (!crewId || !code) return;
    try {
      const link = buildInviteLink(crewId, code);
      await Share.share({
        message: `Join ${crew.name || 'our'} crew on Relay! ${link}`,
      });
    } catch (error) {
      console.error(error.message);
    }
  };

  const handleRotateInvite = async () => {
    if (!crewId) return;
    const code = generateInviteCode();
    await updateDoc(doc(db, 'crews', crewId), { inviteCode: code });
    handleShareInvite(code);
  };

  const handleRemoveMember = (member) => {
    if (!crewId || !user) return;
    Alert.alert(
      'Remove member',
      `Remove ${member.displayName} from the crew?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'crews', crewId, 'members', member.id));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{crew?.name || 'My Crew'}</Text>

      {transmitting.length > 0 && (
        <View style={styles.txBanner}>
          <Text style={styles.txBannerText}>
            {transmitting.map((m) => m.displayName).join(', ')} transmitting
            {transmitting.length === 1 ? 's' : ''}
            {transmitting[0]?.transmittingChannel
              ? ` on ${transmitting[0].transmittingChannel}`
              : ''}
          </Text>
        </View>
      )}

      {/* Roster Container */}
      <ScrollView contentContainerStyle={styles.scrollList}>
        {members.length === 0 && crewId ? (
          <SkeletonList count={5} type="member" />
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {(member.displayName || '?').charAt(0)}
                </Text>
              </View>

              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <Text style={styles.memberRole}>
                  {member.crewRole} · {presenceLabel(member.presence)}
                </Text>
              </View>

              <Circle size={10} color={presenceColor(member.presence)} fill={presenceColor(member.presence)} />

              {isAdmin && member.id !== user?.uid && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(member)}
                >
                  <UserMinus color="#FF4D4D" size={18} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Admin-only actions */}
      {isAdmin && (
        <>
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={() => setShowAddMember(true)}
          >
            <UserPlus color={COLORS.background} size={20} style={{ marginRight: 8 }} />
            <Text style={styles.inviteButtonText}>Add Member to Roster</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.inviteButton} onPress={() => handleShareInvite(crew?.inviteCode)}>
            <UserPlus color={COLORS.background} size={20} style={{ marginRight: 8 }} />
            <Text style={styles.inviteButtonText}>Share Invite Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rotateButton} onPress={handleRotateInvite}>
            <RefreshCw color={COLORS.text} size={18} style={{ marginRight: 8 }} />
            <Text style={styles.rotateButtonText}>Rotate Invite Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.qrButton} onPress={() => setShowQR(true)}>
            <QrCode color={COLORS.text} size={18} style={{ marginRight: 8 }} />
            <Text style={styles.qrButtonText}>Show Crew QR Code</Text>
          </TouchableOpacity>
        </>
      )}

      <QRCodeModal
        visible={showQR}
        onClose={() => setShowQR(false)}
        crewId={crewId}
        inviteCode={crew?.inviteCode}
        crewName={crew?.name}
      />

      <AddMemberBottomSheet
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="Add a Member to Roster"
        dropdownLabel="Assign to Channels"
        items={channels}
        onSubmit={handleAddMember}
      />
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
  txBanner: {
    backgroundColor: 'rgba(217, 101, 0, 0.15)',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: 10,
    marginBottom: 12,
  },
  txBannerText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
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
    textTransform: 'capitalize',
  },
  removeButton: {
    marginLeft: 12,
    padding: 6,
  },
  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  addMemberButton: {
    backgroundColor: COLORS.text,
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rotateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: COLORS.textMuted,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 12,
    marginBottom: 20,
  },
  rotateButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  qrButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: COLORS.textMuted,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 12,
    marginBottom: 20,
  },
  qrButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
