// src/components/AddMemberBottomSheet.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, Animated, ScrollView } from 'react-native';
import { QrCode, ChevronDown, CheckSquare, Square } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import QRScannerScreen from './QRScannerScreen';

export default function AddMemberBottomSheet({
  visible,
  onClose,
  mode = 'member',
  title = 'Add a Member',
  dropdownLabel = 'Assign to',
  items = [],
  onScanQR,
  onSubmit,
  submitText = 'Add Member',
}) {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [show, setShow] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);
      translateX.setValue(400);
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (show) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 400,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShow(false);
        setName('');
        setSubtitle('');
        setSelectedItems([]);
      });
    }
  }, [visible]);

  const handleScanQR = useCallback(() => {
    setShowScanner(true);
  }, []);

  const handleScanned = useCallback((data) => {
    setShowScanner(false);
    setName(data);
  }, []);

  const toggleItem = useCallback((id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      if (mode === 'channel') {
        onSubmit({
          name: name.trim(),
          memberIds: selectedItems,
        });
      } else {
        onSubmit({
          name: name.trim(),
          channelIds: selectedItems,
        });
      }
    }
    setName('');
    setSubtitle('');
    setSelectedItems([]);
    onClose?.();
  }, [mode, name, selectedItems, onSubmit, onClose]);

  const handleCancel = useCallback(() => {
    setName('');
    setSubtitle('');
    setSelectedItems([]);
    onClose?.();
  }, [onClose]);

  if (!show) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={styles.overlayTouch} onPress={handleCancel} />
        <Animated.View style={[styles.sheet, { transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {mode === 'member' && (
              <>
                <TouchableOpacity
                  style={styles.qrSection}
                  activeOpacity={0.7}
                  onPress={handleScanQR}
                >
                  <QrCode color={COLORS.primary} size={48} />
                  <Text style={styles.qrText}>Scan Member QRCode</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Enter member name..."
                  placeholderTextColor="#666666"
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.listLabel}>{dropdownLabel}</Text>

                <View style={styles.listBox}>
                  {items.map((item, index) => {
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.listItem,
                          index < items.length - 1 && styles.listItemBorder,
                        ]}
                        onPress={() => toggleItem(item.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected ? (
                          <CheckSquare color={COLORS.primary} size={22} />
                        ) : (
                          <Square color="#666666" size={22} />
                        )}
                        <Text style={styles.listItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {mode === 'channel' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Channel name..."
                  placeholderTextColor="#666666"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Subtitle / Description"
                  placeholderTextColor="#666666"
                  value={subtitle}
                  onChangeText={setSubtitle}
                />

                <Text style={styles.listLabel}>{dropdownLabel}</Text>

                <View style={styles.listBox}>
                  {items.map((item, index) => {
                    const isSelected = selectedItems.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.listItem,
                          index < items.length - 1 && styles.listItemBorder,
                        ]}
                        onPress={() => toggleItem(item.id)}
                        activeOpacity={0.7}
                      >
                        {isSelected ? (
                          <CheckSquare color={COLORS.primary} size={22} />
                        ) : (
                          <Square color="#666666" size={22} />
                        )}
                        <Text style={styles.listItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>{submitText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <QRScannerScreen
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#000000',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
  },
  listLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  dropdown: {
    width: '100%',
    backgroundColor: '#000000',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listBox: {
    width: '100%',
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 101, 0, 0.4)',
  },
  listItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  footer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#8B3A00',
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
