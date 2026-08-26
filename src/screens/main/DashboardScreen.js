// src/screens/main/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLORS, SIZES } from '../../constants/theme';

export default function DashboardScreen({ navigation }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelSubtitle, setNewChannelSubtitle] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChannels(channelList);
      setLoading(false);
    }, (error) => {
      console.error("Firestore listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      await addDoc(collection(db, 'channels'), {
        name: newChannelName,
        subtitle: newChannelSubtitle || 'Custom Channel',
        status: 'Online',
        createdAt: serverTimestamp(),
      });

      setNewChannelName('');
      setNewChannelSubtitle('');
      setModalVisible(false);
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Dashboard</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollList}>
          {channels.map((channel) => (
            <TouchableOpacity
              key={channel.id}
              style={styles.channelCard}
              onPress={() => navigation.navigate('PTT', { channelName: channel.name })}
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
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Plus color={COLORS.background} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.createButtonText}>Create New Channel</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Channel</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Channel Name (e.g. Sound Booth)"
              placeholderTextColor={COLORS.textMuted}
              value={newChannelName}
              onChangeText={setNewChannelName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Subtitle / Description"
              placeholderTextColor={COLORS.textMuted}
              value={newChannelSubtitle}
              onChangeText={setNewChannelSubtitle}
            />

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleCreateChannel}>
              <Text style={styles.modalSubmitText}>Add Channel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.secondary,
    borderWidth: 1,
    borderRadius: SIZES.radius,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    color: COLORS.text,
    padding: 14,
    marginBottom: 16,
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
});
