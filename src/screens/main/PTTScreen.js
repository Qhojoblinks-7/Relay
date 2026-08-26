// src/screens/main/PTTScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Wifi, Volume2, X, Mic } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { useWebRTC } from '../../context/WebRTCContext';

const RING_SIZE = 160;

// Each ring is a concentric circle: bigger rings are fainter (fades as it gets
// bigger) and expand/brighten in response to the user's voice level.
const RING_CONFIGS = [
  { base: 1.0, amp: 0.45, opacity: 0.55 },
  { base: 1.3, amp: 0.65, opacity: 0.4 },
  { base: 1.6, amp: 0.85, opacity: 0.28 },
  { base: 1.9, amp: 1.05, opacity: 0.16 },
];

export default function PTTScreen({ route, navigation }) {
  const { channelName = 'General' } = route.params || {};
  const [isTransmitting, setIsTransmitting] = useState(false);
  const { startTransmitting, stopTransmitting, levelValue } = useWebRTC();

  const handlePressIn = () => {
    setIsTransmitting(true);
    startTransmitting();
  };

  const handlePressOut = () => {
    setIsTransmitting(false);
    stopTransmitting();
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X color={COLORS.text} size={28} />
        </Pressable>
        <Wifi color={COLORS.primary} size={24} />
      </View>

      {/* Active Channel/User Name */}
      <Text style={styles.title}>{channelName}</Text>

      {/* PTT Stack: 4 concentric circles that fade as they get bigger,
          expanding & brightening with the user's voice */}
      <View style={styles.pttContainer}>
        {RING_CONFIGS.map((cfg, i) => {
          const scale = levelValue.interpolate({
            inputRange: [0, 1],
            outputRange: [cfg.base, cfg.base + cfg.amp],
          });
          const opacity = levelValue.interpolate({
            inputRange: [0, 1],
            outputRange: [cfg.opacity * 0.25, cfg.opacity],
          });

          return (
            <Animated.View
              key={i}
              style={[styles.ring, { opacity, transform: [{ scale }] }]}
            />
          );
        })}

        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.micButton,
            isTransmitting && styles.micButtonActive,
          ]}
        >
          <Mic color={COLORS.text} size={60} />
        </Pressable>
      </View>

      {/* Bottom Volume Slider Control */}
      <View style={styles.bottomControls}>
        <View style={styles.volumeIcon}>
          <Volume2 color={COLORS.background} size={24} />
        </View>
        <View style={styles.sliderBar}>
          <View style={styles.sliderFill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pttContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    left: '50%',
    top: '50%',
    marginLeft: -RING_SIZE / 2,
    marginTop: -RING_SIZE / 2,
    backgroundColor: COLORS.primary,
  },
  micButton: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#D96500',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  volumeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  sliderFill: {
    width: '65%',
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
