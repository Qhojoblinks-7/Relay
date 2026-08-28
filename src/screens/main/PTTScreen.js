// src/screens/main/PTTScreen.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Vibration, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Wifi, Volume2, X, Mic, SlidersHorizontal, Smartphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import InCallManager from 'react-native-incall-manager';
import VolumeManager from 'react-native-volume-manager';
import { COLORS, SIZES } from '../../constants/theme';
import useWebRTCStore from '../../stores/webrtcStore';

const { width } = Dimensions.get('window');
const RING_SIZE = Math.min(width * 0.55, 200);
const RING_CONFIGS = [
  { base: 1.0, amp: 0.45, opacity: 0.55 },
  { base: 1.3, amp: 0.65, opacity: 0.4 },
  { base: 1.6, amp: 0.85, opacity: 0.28 },
  { base: 1.9, amp: 1.05, opacity: 0.16 },
];

export default function PTTScreen({ route, navigation }) {
  const { crewId, channelId, channelName = 'General' } = route.params || {};
  const startTransmitting = useWebRTCStore((state) => state.startTransmitting);
  const stopTransmitting = useWebRTCStore((state) => state.stopTransmitting);
  const isMuted = useWebRTCStore((state) => state.isMuted);
  const isTransmitting = isPressed;
  const isNoiseCancellationActive = useWebRTCStore((state) => state.isNoiseCancellationActive);
  const toggleNoiseCancellation = useWebRTCStore((state) => state.toggleNoiseCancellation);
  const levelValue = useWebRTCStore((state) => state.levelValue);
  const ready = useWebRTCStore((state) => state.ready);
  const joinChannel = useWebRTCStore((state) => state.joinChannel);
  const leaveChannel = useWebRTCStore((state) => state.leaveChannel);
  const activeChannel = useWebRTCStore((state) => state.activeChannel);
  const canTalk = !!activeChannel && activeChannel.role !== 'observer';
  const channelBusy = useWebRTCStore((state) => state.channelBusy);
  const currentSpeaker = useWebRTCStore((state) => state.currentSpeaker);

  const soundRef = useRef(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleLoop = useRef(null);
  const sliderWidth = useRef(0);
  const joinChannelRef = useRef(joinChannel);
  const leaveChannelRef = useRef(leaveChannel);
  const [volume, setVolume] = useState(0.65);
  const [isPressed, setIsPressed] = useState(false);
  const [handsetMode, setHandsetMode] = useState(false);
  const volumeSubRef = useRef(null);
  const lastKnownVolume = useRef(0.65);

  joinChannelRef.current = joinChannel;
  leaveChannelRef.current = leaveChannel;

  useEffect(() => {
    console.log('[PTT] mount');
    (async () => {
      try {
        const { volume } = await VolumeManager.getVolume();
        lastKnownVolume.current = volume;
      } catch (e) {
        // Volume manager not ready
      }
    })();

    return () => {
      console.log('[PTT] unmount');
      deactivateKeepAwake();
      try {
        InCallManager.setKeepScreenOn(false);
        InCallManager.stopProximitySensor();
      } catch (e) {
        // cleanup
      }
      setHandsetMode(false);
      if (volumeSubRef.current) {
        volumeSubRef.current.remove();
        volumeSubRef.current = null;
      }
    };
  }, []);

  const enableHandsetMode = useCallback(async () => {
    try {
      await activateKeepAwakeAsync();
      InCallManager.setKeepScreenOn(true);
      InCallManager.startProximitySensor();
      setHandsetMode(true);
    } catch (e) {
      console.warn('[PTT] handset mode setup failed:', e.message);
    }
  }, []);

  const disableHandsetMode = useCallback(async () => {
    try {
      deactivateKeepAwake();
      InCallManager.setKeepScreenOn(false);
      InCallManager.stopProximitySensor();
      setHandsetMode(false);
    } catch (e) {
      console.warn('[PTT] handset mode teardown failed:', e.message);
    }
  }, []);

  // Switch the voice client to the selected crew channel once the voice client
  // is ready. Non-members will be rejected inside joinChannel.
  useEffect(() => {
    console.log('[PTT] join effect', { ready, crewId, channelId });
    if (!ready || !crewId || !channelId) return;
    console.log('[PTT] joining channel', { crewId, channelId, channelName });
    joinChannelRef.current(crewId, channelId).catch((e) => {
      console.warn('[PTT] Could not join channel:', e.message);
    });
  }, [ready, crewId, channelId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[PTT] screen focused', { ready, crewId, channelId });
      enableHandsetMode();
      if (!ready || !crewId || !channelId) return;
      joinChannelRef.current(crewId, channelId).catch((e) => {
        console.warn('[PTT] focus join failed:', e.message);
      });
      return () => {
        console.log('[PTT] screen unfocused, leaving channel');
        leaveChannelRef.current?.();
        disableHandsetMode();
      };
    }, [ready, crewId, channelId, enableHandsetMode, disableHandsetMode])
  );

  const playRadioBeep = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      // Audio playback fallback
    }
  };

  const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Heavy) => {
    try {
      await Haptics.impactAsync(style);
    } catch (e) {
      Vibration.vibrate(50);
    }
  };

  const handlePressIn = async () => {
    if (!canTalk || channelBusy) return;
    if (rippleLoop.current) {
      rippleLoop.current.stop();
      rippleLoop.current = null;
    }
    rippleAnim.setValue(0);
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    playRadioBeep();
    const started = await startTransmitting();
    if (!started) return;
    setIsPressed(true);

    rippleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handlePressOut = async () => {
    if (rippleLoop.current) {
      rippleLoop.current.stop();
      rippleLoop.current = null;
    }
    rippleAnim.stopAnimation();
    rippleAnim.setValue(0);
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    playRadioBeep();
    stopTransmitting();
    setIsPressed(false);
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(newVolume);
      }
    } catch (e) {
      // Volume update fallback
    }
  };

  // Map volume button presses to PTT for hands-free operation.
  const handlePressInRef = useRef(handlePressIn);
  const handlePressOutRef = useRef(handlePressOut);

  useEffect(() => {
    handlePressInRef.current = handlePressIn;
    handlePressOutRef.current = handlePressOut;
  });

  useEffect(() => {
    if (!activeChannel || !VolumeManager?.addVolumeListener) return;

    const subscription = VolumeManager.addVolumeListener(({ volume }) => {
      if (!canTalk || channelBusy) return;

      const previous = lastKnownVolume.current;
      lastKnownVolume.current = volume;

      if (volume > previous + 0.02) {
        handlePressInRef.current?.();
      } else if (volume < previous - 0.02) {
        handlePressOutRef.current?.();
      }
    });

    volumeSubRef.current = subscription;

    return () => {
      if (volumeSubRef.current) {
        volumeSubRef.current.remove();
        volumeSubRef.current = null;
      }
    };
  }, [activeChannel, canTalk, channelBusy]);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X color={COLORS.text} size={28} />
        </Pressable>

        <Pressable
          onPress={toggleNoiseCancellation}
          style={[
            styles.ncBadge,
            isNoiseCancellationActive && styles.ncBadgeActive,
          ]}
        >
          <SlidersHorizontal color={COLORS.text} size={14} />
          <Text style={styles.ncText}>
            {isNoiseCancellationActive ? 'NC Active' : 'NC Off'}
          </Text>
        </Pressable>

        <View style={styles.handsetBadge}>
          <Smartphone color={handsetMode ? COLORS.primary : COLORS.textMuted} size={20} />
          <Text style={[styles.handsetText, handsetMode && styles.handsetTextActive]}>
            {handsetMode ? 'Handset' : 'Phone'}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{channelName}</Text>

      {/* PTT Stack */}
      <View style={styles.pttContainer}>
        {RING_CONFIGS.map((cfg, i) => {
          const voiceScale = levelValue.interpolate({
            inputRange: [0, 1],
            outputRange: [cfg.base, cfg.base + cfg.amp],
          });
          const voiceOpacity = levelValue.interpolate({
            inputRange: [0, 1],
            outputRange: [cfg.opacity * 0.25, cfg.opacity],
          });

          const stagger = i / (RING_CONFIGS.length - 1);
          const rippleScale = rippleAnim.interpolate({
            inputRange: [stagger, stagger + 0.3],
            outputRange: [1, 1.15],
            extrapolate: 'clamp',
          });
          const rippleOpacity = rippleAnim.interpolate({
            inputRange: [stagger, stagger + 0.3],
            outputRange: [0, cfg.opacity * 0.7],
            extrapolate: 'clamp',
          });

          const scale = Animated.multiply(voiceScale, rippleScale);
          const opacity = Animated.add(voiceOpacity, rippleOpacity);

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
          disabled={!canTalk}
          style={[
            styles.micButton,
            isMuted && styles.micButtonActive,
            !canTalk && styles.micButtonDisabled,
            isTransmitting && styles.micButtonTransmitting,
          ]}
        >
          <Mic color={COLORS.text} size={RING_SIZE * 0.35} />
        </Pressable>
      </View>

      <View style={styles.pttStatus}>
        {channelBusy && currentSpeaker && (
          <Text style={styles.speakerText}>{currentSpeaker} is talking</Text>
        )}
        {channelBusy && !currentSpeaker && (
          <Text style={styles.speakerText}>Channel busy</Text>
        )}
        {!canTalk && (
          <Pressable onPress={() => crewId && channelId && joinChannelRef.current(crewId, channelId).catch((e) => console.warn('[PTT] retry join failed:', e.message))}>
            <Text style={styles.listenOnlyText}>Retry Join</Text>
          </Pressable>
        )}
        {!canTalk && (
          <Text style={styles.listenOnlyText}>Listen-only · observers can't transmit</Text>
        )}
        {canTalk && !channelBusy && !isTransmitting && (
          <Text style={styles.listenOnlyText}>Press volume up or tap to talk</Text>
        )}
        {canTalk && isTransmitting && (
          <Text style={[styles.listenOnlyText, styles.transmittingText]}>Transmitting...</Text>
        )}
      </View>

      {/* Volume Control Bar */}
      <View style={styles.bottomControls}>
        <View style={styles.volumeIcon}>
          <Volume2 color={COLORS.background} size={24} />
        </View>
        <Pressable
          onLayout={(e) => { sliderWidth.current = e.nativeEvent.layout.width; }}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            const newVolume = Math.max(0, Math.min(1, x / sliderWidth.current));
            handleVolumeChange(newVolume);
          }}
          style={styles.sliderBar}
        >
          <View style={[styles.sliderFill, { width: `${volume * 100}%` }]} />
        </Pressable>
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
  ncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ncBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  ncText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  handsetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  handsetText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  handsetTextActive: {
    color: COLORS.primary,
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
    height: 480,
    marginTop: 40,
    overflow: 'hidden',
  },
  pttStatus: {
    alignItems: 'center',
    marginTop: 12,
    minHeight: 60,
    justifyContent: 'center',
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  micButtonActive: {
    backgroundColor: '#D96500',
  },
  micButtonTransmitting: {
    backgroundColor: '#D96500',
    transform: [{ scale: 1.05 }],
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  listenOnlyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  transmittingText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  speakerText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
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
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
