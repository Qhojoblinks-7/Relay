import React, { useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

export default function KeyboardAwareScrollView({ children, contentContainerStyle }) {
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => hideSub.remove();
  }, []);

  const basePadding =
    (StyleSheet.flatten(contentContainerStyle || {}).paddingBottom || 0) +
    (insets.bottom || 0);

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: COLORS.background }]}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: basePadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
});
