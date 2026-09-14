import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, LockKeyhole, Mail, Sparkles } from '@/components/icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestVerificationCode } from '@/lib/auth/request-verification-code';
import { COLORS } from '@/lib/interi';

function TransformationPreview({ compact }: { compact: boolean }) {
  return (
    <View
      testID="sign-in-transformation-preview"
      accessible
      accessibilityLabel="Room before and after redesign preview"
      className="relative flex-row overflow-hidden rounded-[28px] border"
      style={{
        height: compact ? 164 : 214,
        borderColor: COLORS.line,
        backgroundColor: COLORS.sand,
        shadowColor: '#2A211C',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 5,
      }}>
      <View className="relative flex-1 overflow-hidden">
        <Image
          testID="sign-in-before-image"
          source={require('../assets/room-example.jpg')}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(37,32,27,0.20)', 'rgba(37,32,27,0.50)']}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/45 px-3 py-1.5">
          <Text className="text-[9px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.white }}>
            Before
          </Text>
        </View>
        <Text className="absolute bottom-3 left-3 text-[11px] font-medium" style={{ color: COLORS.white }}>
          Original room
        </Text>
      </View>

      <View className="relative flex-1 overflow-hidden">
        <Image
          testID="sign-in-after-image"
          source={require('../assets/room-after.jpg')}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(224,107,76,0.04)', 'rgba(37,32,27,0.24)']}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View className="absolute right-3 top-3 rounded-full px-3 py-1.5" style={{ backgroundColor: COLORS.coral }}>
          <Text className="text-[9px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.white }}>
            After
          </Text>
        </View>
        <Text className="absolute bottom-3 right-3 text-[11px] font-medium" style={{ color: COLORS.white }}>
          Warm modern
        </Text>
      </View>

      <View pointerEvents="none" className="absolute bottom-0 left-1/2 top-0 w-px bg-white/80" />
      <View
        pointerEvents="none"
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-[22px] -translate-y-[22px] items-center justify-center rounded-full border"
        style={{
          borderColor: 'rgba(42,33,28,0.12)',
          backgroundColor: COLORS.paper,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 4,
        }}>
        <ArrowRight size={18} color={COLORS.espresso} strokeWidth={1.8} />
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const [email, setEmail] = useState<string>('');
  const { height } = useWindowDimensions();
  const compact = height < 780;

  const sendCode = useMutation({
    mutationFn: async () => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
      await requestVerificationCode(normalizedEmail);
      return normalizedEmail;
    },
    onSuccess: (normalizedEmail) => router.push(`/verify-otp?email=${encodeURIComponent(normalizedEmail)}` as never),
  });

  return (
    <SafeAreaView testID="sign-in-screen" className="flex-1" style={{ backgroundColor: COLORS.chalk }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 20 }}>
          <View className="flex-row items-end justify-between">
            <Text style={{ color: COLORS.espresso, fontFamily: 'Georgia', fontSize: 36, letterSpacing: -1.4 }}>interi</Text>
            <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: '#E8E0D3' }}>
              <Sparkles size={13} color={COLORS.oliveDark} />
              <Text className="ml-2 text-[10px] font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.oliveDark }}>
                Private studio
              </Text>
            </View>
          </View>

          <View className={compact ? 'mt-8' : 'mt-11'}>
            <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
              Your rooms, remembered
            </Text>
            <Text
              className={compact ? 'mt-3 text-[38px] leading-[41px]' : 'mt-4 text-[44px] leading-[47px]'}
              style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.7 }}>
              A home for every idea.
            </Text>
            <Text className="mt-3 max-w-[350px] text-[15px] leading-[22px]" style={{ color: COLORS.olive }}>
              Redesign your rooms. Explore new styles. Keep every transformation in one place.
            </Text>
          </View>

          <View className={compact ? 'mt-5' : 'mt-7'}>
            <TransformationPreview compact={compact} />
          </View>

          <View className={compact ? 'mt-5' : 'mt-6'}>
            <View className="rounded-[28px] border p-4" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#F2E8DB' }}>
                  <Mail size={18} color={COLORS.coral} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold" style={{ color: COLORS.espresso }}>Continue with email</Text>
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
                onChangeText={(value) => {
                  setEmail(value);
                  if (sendCode.isError) sendCode.reset();
                }}
                onSubmitEditing={() => sendCode.mutate()}
                placeholder="you@example.com"
                placeholderTextColor="#9B9185"
                className="mt-4 min-h-14 rounded-2xl border px-4 text-base"
                style={{ borderColor: COLORS.line, backgroundColor: COLORS.white, color: COLORS.espresso }}
              />

              {sendCode.isError ? (
                <Text testID="sign-in-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>
                  {sendCode.error instanceof Error ? sendCode.error.message : 'We could not send your code.'}
                </Text>
              ) : null}

              <Pressable
                testID="send-code-button"
                accessibilityRole="button"
                disabled={sendCode.isPending || !email.trim()}
                onPress={() => sendCode.mutate()}
                className="mt-3 min-h-[54px] flex-row items-center justify-center overflow-hidden rounded-full active:scale-[0.98]"
                style={{ opacity: !email.trim() ? 0.45 : 1 }}>
                <LinearGradient
                  colors={[COLORS.coral, '#E8583C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <Text className="text-base font-semibold" style={{ color: COLORS.white }}>
                  {sendCode.isPending ? 'Sending code…' : 'Send sign-in code'}
                </Text>
                {!sendCode.isPending ? <ArrowRight size={18} color={COLORS.white} style={{ marginLeft: 9 }} /> : null}
              </Pressable>
            </View>

            <View className="mt-4 flex-row items-center justify-center px-3">
              <LockKeyhole size={13} color={COLORS.olive} />
              <Text className="ml-2 text-center text-xs" style={{ color: COLORS.olive }}>
                Password-free sign-in. Saved designs are linked to your account.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
