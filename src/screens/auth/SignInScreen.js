// src/screens/auth/SignInScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SIZES } from '../../constants/theme';
import { globalStyles } from '../../constants/globalStyles';
import { useAuth } from '../../context/AuthContext';

export default function SignInScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const joinCrewId = route.params?.joinCrewId;
  const joinCode = route.params?.joinCode;

  const handleSignIn = async () => {
    try {
      await signIn({ email: email.trim(), password });
      if (joinCrewId && joinCode) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'JoinCrew', params: { joinCrewId, joinCode } }],
        });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Sign In Failed', err.message || 'Please check your credentials.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={globalStyles.title}>Welcome Back</Text>

        <TextInput
          style={globalStyles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextInput
          style={globalStyles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity style={globalStyles.primaryButton} onPress={handleSignIn}>
          <Text style={globalStyles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.padding,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF4D4D',
    marginBottom: 12,
    textAlign: 'center',
  },
  backText: {
    color: COLORS.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
});
