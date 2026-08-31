// src/screens/auth/SignInScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS, SIZES } from '../../constants/theme';
import { globalStyles } from '../../constants/globalStyles';
import useAuthStore from '../../stores/authStore';
import AuthHeader from '../../components/AuthHeader';
import AuthBackground from '../../components/AuthBackground';

export default function SignInScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const signIn = useAuthStore((state) => state.signIn);
  const authError = useAuthStore((state) => state.authError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <AuthBackground />
        <AuthHeader />
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
          importantForAutofill="yes"
        />
        <View style={styles.passwordWrapper}>
          <TextInput
            style={[globalStyles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            importantForAutofill="yes"
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
          </TouchableOpacity>
        </View>
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity style={globalStyles.primaryButton} onPress={handleSignIn}>
          <Text style={globalStyles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('GetStarted')}>
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
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
  },
  errorText: {
    color: '#FF4D4D',
    marginBottom: 12,
    textAlign: 'center',
  },
  backText: {
    color: COLORS.textMuted,
    marginTop: 16,
    textAlign: "center",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: SIZES.medium,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
  },
});
