import { NativeModules, NativeEventEmitter, DeviceEventEmitter, AppState } from 'react-native';
import useWebRTCStore from '../stores/webrtcStore';

const { PTTBackground } = NativeModules;
const headsetEmitter = PTTBackground ? new NativeEventEmitter(PTTBackground) : null;

const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;

const BACKGROUND_PTT_TIMEOUT = 150;

let backgroundVolumeSub = null;
let headsetSub = null;
let pttTimerRef = null;
let isTransmitting = false;

function canHandleBackgroundPTT() {
  const store = useWebRTCStore.getState();
  const activeChannel = store.activeChannel;
  const channelBusy = store.channelBusy;
  const canTalk = !!activeChannel && activeChannel.role !== 'observer';
  const appState = AppState.currentState;

  console.log('[BackgroundPTT] canHandleBackgroundPTT check', {
    hasActiveChannel: !!activeChannel,
    canTalk,
    channelBusy,
    appState,
  });

  if (!canTalk || channelBusy) return false;
  if (appState === 'active') return false;

  return true;
}

function handleBackgroundVolumeKey(event) {
  console.log('[BackgroundPTT] Volume key event:', event);
  if (!canHandleBackgroundPTT()) {
    console.log('[BackgroundPTT] Cannot handle background PTT - skipping');
    return;
  }

  const { keyCode, action } = event;
  if (action !== 'down') return;

  const store = useWebRTCStore.getState();

  if (keyCode === KEYCODE_VOLUME_UP) {
    if (isTransmitting) {
      pttTimerRef && clearTimeout(pttTimerRef);
      pttTimerRef = setTimeout(() => {
        if (!isTransmitting) return;
        isTransmitting = false;
        store.stopTransmitting();
      }, BACKGROUND_PTT_TIMEOUT);
      return;
    }

    isTransmitting = true;
    store.startTransmitting();

    pttTimerRef && clearTimeout(pttTimerRef);
    pttTimerRef = setTimeout(() => {
      if (!isTransmitting) return;
      isTransmitting = false;
      store.stopTransmitting();
    }, BACKGROUND_PTT_TIMEOUT);
  } else if (keyCode === KEYCODE_VOLUME_DOWN) {
    if (pttTimerRef) {
      clearTimeout(pttTimerRef);
      pttTimerRef = null;
    }
    if (isTransmitting) {
      isTransmitting = false;
      store.stopTransmitting();
    }
  }
}

let initialized = false;

export const registerHeadsetEvents = () => {
  if (!headsetEmitter || headsetSub) return;
  headsetSub = headsetEmitter.addListener('PTTHeadsetChanged', (hasWiredHeadset) => {
    useWebRTCStore.setState({ hasWiredHeadset });
  });
};

export const unregisterHeadsetEvents = () => {
  if (headsetSub) {
    headsetSub.remove();
    headsetSub = null;
  }
};

export const initBackgroundPTT = () => {
  if (initialized) return;
  initialized = true;

  registerHeadsetEvents();

  backgroundVolumeSub = DeviceEventEmitter.addListener(
    'PTTBackgroundVolumeKey',
    handleBackgroundVolumeKey
  );

  console.log('[BackgroundPTT] Global listener registered');
};

export const startBackgroundPTTService = () => {
  if (PTTBackground && typeof PTTBackground.startBackgroundPTT === 'function') {
    PTTBackground.startBackgroundPTT();
    console.log('[BackgroundPTT] Foreground service started');
  }
};

export const stopBackgroundPTTService = () => {
  if (PTTBackground && typeof PTTBackground.stopBackgroundPTT === 'function') {
    PTTBackground.stopBackgroundPTT();
    console.log('[BackgroundPTT] Foreground service stopped');
  }
  if (pttTimerRef) {
    clearTimeout(pttTimerRef);
    pttTimerRef = null;
  }
  isTransmitting = false;
};

export const stopBackgroundPTT = () => {
  stopBackgroundPTTService();
  if (backgroundVolumeSub) {
    backgroundVolumeSub.remove();
    backgroundVolumeSub = null;
  }
  unregisterHeadsetEvents();
  initialized = false;
};
