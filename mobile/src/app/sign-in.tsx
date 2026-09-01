import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient } from '@/lib/auth/auth-client';
import { COLORS } from '@/lib/interi';

export default function SignInScreen() {
  const [email, setEmail] = useState<string>('');

  const sendCode = useMutation({
    mutationFn: async () => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
      const result = await authClient.emailOtp.sendVerificationOtp({ email: normalizedEmail, type: 'sign-in' });
      if (result.error) throw new Error(result.error.message ?? 'We could not send your code.');
      return normalizedEmail;
    },
    onSuccess: (normalizedEmail) => router.push(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}` as never),
  });

  return (
    <SafeAreaView testID="sign-in-screen" className="flex-1" style={{ backgroundColor: COLORS.chalk }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-between px-6 pb-8 pt-5">
          <View>
            <View className="flex-row items-end justify-between">
              <Text style={{ color: COLORS.espresso, fontFamily: 'Georgia', fontSize: 36, letterSpacing: -1.4 }}>interi</Text>
              <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: '#E8E0D3' }}>
                <Sparkles size={13} color={COLORS.oliveDark} />
                <Text className="ml-2 text-[10px] font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.oliveDark }}>Private studio</Text>
              </View>
            </View>

            <View className="mt-14 max-w-[355px]">
              <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>Your rooms, remembered</Text>
              <Text className="mt-4 text-[46px] leading-[49px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.8 }}>
                A home for every idea.
              </Text>
              <Text className="mt-5 text-base leading-6" style={{ color: COLORS.olive }}>
                Sign in to keep your designs together and return to them from any device.
              </Text>
            </View>
          </View>

          <View>
            <View className="rounded-[28px] border p-5" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: '#F2E8DB' }}>
                  <Mail size={19} color={COLORS.coral} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>Continue with email</Text>
                  <Text className="mt-0.5 text-xs" style={{ color: COLORS.olive }}>No password needed</Text>
                </View>
              </View>

              <TextInput
                testID="email-input"
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                value={email}
                onChangeText={(value) => { setEmail(value); if (sendCode.isError) sendCode.reset(); }}
                onSubmitEditing={() => sendCode.mutate()}
                placeholder="you@example.com"
                placeholderTextColor="#9B9185"
                className="mt-5 min-h-14 rounded-2xl border px-4 text-base"
                style={{ borderColor: COLORS.line, backgroundColor: COLORS.white, color: COLORS.espresso }}
              />

              {sendCode.isError ? (
                <Text testID="sign-in-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>
                  {sendCode.error instanceof Error ? sendCode.error.message : 'We could not send your code.'}
                </Text>
              ) : null}

              <Pressable
                testID="send-code-button"
                disabled={sendCode.isPending || !email.trim()}
                onPress={() => sendCode.mutate()}
                className="mt-4 min-h-[56px] flex-row items-center justify-center overflow-hidden rounded-full active:scale-[0.98]"
                style={{ opacity: !email.trim() ? 0.45 : 1 }}>
                <LinearGradient colors={[COLORS.coral, '#E8583C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
                <Text className="text-base font-semibold" style={{ color: COLORS.white }}>{sendCode.isPending ? 'Sending code…' : 'Send verification code'}</Text>
                {!sendCode.isPending ? <ArrowRight size={18} color={COLORS.white} style={{ marginLeft: 9 }} /> : null}
              </Pressable>
            </View>

            <View className="mt-5 flex-row items-center justify-center">
              <LockKeyhole size={13} color={COLORS.olive} />
              <Text className="ml-2 text-xs" style={{ color: COLORS.olive }}>Your projects stay private to your account.</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
