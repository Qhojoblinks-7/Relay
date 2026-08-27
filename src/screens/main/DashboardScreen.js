// src/screens/main/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import AddMemberBottomSheet from '../../components/AddMemberBottomSheet';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function DashboardScreen({ navigation }) {
  const { user, crewId, crewRole } = useAuth();
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Only crew owners/admins may create top-level channels.
  const isAdmin = crewRole === 'owner' || crewRole === 'admin';

  // Live list of crew channels from Firestore.
  useEffect(() => {
    if (!crewId) return;
    const unsub = onSnapshot(
      collection(db, 'crews', crewId, 'channels'),
      (snap) => {
        setChannels(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              subtitle: data.type === 'private' ? 'Private' : data.createdBy === user?.uid ? 'You' : 'Open',
              status: 'Online',
            };
          })
        );
      }
    );
    return unsub;
  }, [crewId, user?.uid]);

  // Live crew roster for assigning members to new channels.
  useEffect(() => {
    if (!crewId) return;
    const unsub = onSnapshot(
      collection(db, 'crews', crewId, 'members'),
      (snap) => {
        setMembers(
          snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, name: data.displayName };
          })
        );
      }
    );
    return unsub;
  }, [crewId]);

  const handleCreateChannel = async ({ name, memberIds }) => {
    if (!name?.trim() || !crewId || !user) return;
    const channelRef = await addDoc(collection(db, 'crews', crewId, 'channels'), {
      name: name.trim(),
      type: 'open',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    const channelId = channelRef.id;

    // Creator is the channel admin.
    await setDoc(doc(db, 'crews', crewId, 'channels', channelId, 'members', user.uid), {
      role: 'admin',
      joinedAt: serverTimestamp(),
    });

    // Add any selected crew members as channel members.
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const uid of memberIds) {
        await setDoc(doc(db, 'crews', crewId, 'channels', channelId, 'members', uid), {
          role: 'member',
          joinedAt: serverTimestamp(),
        });
      }
    } else {
      // No specific members picked: open the channel to the whole crew.
      const membersSnap = await getDocs(collection(db, 'crews', crewId, 'members'));
      for (const m of membersSnap.docs) {
        if (m.id === user.uid) continue;
        await setDoc(doc(db, 'crews', crewId, 'channels', channelId, 'members', m.id), {
          role: 'member',
          joinedAt: serverTimestamp(),
        });
      }
    }

    setShowCreateChannel(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Dashboard</Text>

      <ScrollView contentContainerStyle={styles.scrollList}>
        {channels.map((channel) => (
          <TouchableOpacity
            key={channel.id}
            style={styles.channelCard}
            onPress={() =>
              navigation.navigate('PTT', {
                crewId,
                channelId: channel.id,
                channelName: channel.name,
              })
            }
          >
            <View style={styles.cardContent}>
              <Text style={styles.channelName}>{channel.name}</Text>
              <Text style={styles.channelSubtitle}>{channel.subtitle}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{channel.status || 'Online'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isAdmin && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateChannel(true)}
        >
          <Plus color={COLORS.background} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.createButtonText}>Create New Channel</Text>
        </TouchableOpacity>
      )}

      <AddMemberBottomSheet
        visible={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        mode="channel"
        title="Create New Channel"
        dropdownLabel="Assign Members"
        items={members.filter((m) => m.id !== user?.uid)}
        submitText="Create Channel"
        onSubmit={handleCreateChannel}
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
  scrollList: {
    paddingBottom: 20,
  },
  channelCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardContent: {
    flex: 1,
  },
  channelName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  channelSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: COLORS.text,
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
