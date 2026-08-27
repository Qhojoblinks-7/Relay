// src/components/QRScannerScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { COLORS } from '../constants/theme';
import { X } from 'lucide-react-native';

export default function QRScannerScreen({ visible, onClose, onScanned }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('[QRScanner] camera permission status:', status);
        setHasPermission(status === 'granted');
      })();
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    onScanned?.(data);
  };

  const handleClose = () => {
    setScanned(false);
    onClose?.();
  };

  if (!visible) return null;

  console.log('[QRScanner] render state:', { visible, hasPermission, scanned });

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mute
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X color={COLORS.text} size={28} />
          </TouchableOpacity>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.instruction}>Point your camera at a QR code</Text>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  bottomBar: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instruction: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  rescanButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
  },
  rescanText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  closeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
