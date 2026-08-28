import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SIZES } from '../constants/theme';
import { X } from 'lucide-react-native';
import { buildInviteLink } from '../lib/invite';

export default function QRCodeModal({ visible, onClose, crewId, inviteCode, crewName }) {
  const inviteLink = crewId && inviteCode ? buildInviteLink(crewId, inviteCode) : '';

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join ${crewName || 'our'} crew on Relay! ${inviteLink}`,
      });
    } catch (e) {
      console.error(e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={COLORS.text} size={28} />
          </TouchableOpacity>

          <Text style={styles.title}>Scan to Join</Text>
          <Text style={styles.subtitle}>{crewName || 'Crew'}</Text>

          <View style={styles.qrContainer}>
            {inviteLink ? (
              <QRCode value={inviteLink} size={220} backgroundColor={COLORS.background} color={COLORS.text} />
            ) : (
              <Text style={styles.errorText}>No invite code available</Text>
            )}
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Invite Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: SIZES.extraLarge,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: SIZES.font,
    marginBottom: 24,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    marginBottom: 24,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  shareButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
