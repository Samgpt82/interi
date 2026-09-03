import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MailCheck } from '@/components/icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient } from '@/lib/auth/auth-client';
import { requestVerificationCode } from '@/lib/auth/request-verification-code';
import { useInvalidateSession } from '@/lib/auth/use-session';
import { COLORS } from '@/lib/interi';

export default function VerifyOtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const invalidateSession = useInvalidateSession();

  const verifyCode = useMutation({
    mutationFn: async (otp: string) => {
      const result = await authClient.signIn.emailOtp({ email: email.trim(), otp });
      if (result.error) throw new Error(result.error.message ?? 'That code is not valid.');
      await invalidateSession();
    },
    onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  });

  const resendCode = useMutation({
    mutationFn: async () => {
      await requestVerificationCode(email.trim().toLowerCase());
    },
  });

  return (
    <SafeAreaView testID="verify-otp-screen" className="flex-1" style={{ backgroundColor: COLORS.chalk }}>
      <View className="flex-1 px-6 pb-8 pt-4">
        <Pressable testID="verify-back-button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          <ArrowLeft size={20} color={COLORS.espresso} />
        </Pressable>

        <View className="mt-14 h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#F2E8DB' }}>
          <MailCheck size={27} color={COLORS.coral} strokeWidth={1.8} />
        </View>
        <Text className="mt-7 text-[42px] leading-[46px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.5 }}>Check your inbox.</Text>
        <Text className="mt-4 text-base leading-6" style={{ color: COLORS.olive }}>
          We sent a six-digit sign-in code to{`\n`}<Text className="font-semibold" style={{ color: COLORS.espresso }}>{email}</Text>
        </Text>

        <View className="mt-10">
          <OtpInput
            numberOfDigits={6}
            onTextChange={() => { if (verifyCode.isError) verifyCode.reset(); }}
            onFilled={(otp) => verifyCode.mutate(otp)}
            type="numeric"
            theme={{
              containerStyle: { gap: 8 },
              pinCodeContainerStyle: { width: 48, height: 58, borderRadius: 16, borderColor: COLORS.line, backgroundColor: COLORS.paper },
              pinCodeTextStyle: { color: COLORS.espresso, fontSize: 22, fontWeight: '600' },
              focusedPinCodeContainerStyle: { borderColor: COLORS.coral, borderWidth: 1.5 },
            }}
          />
        </View>

        {verifyCode.isPending ? <Text testID="verify-loading" className="mt-5 text-center text-sm" style={{ color: COLORS.olive }}>Opening your studio…</Text> : null}
        {verifyCode.isError ? <Text testID="verify-error" className="mt-5 text-center text-sm" style={{ color: COLORS.coral }}>{verifyCode.error instanceof Error ? verifyCode.error.message : 'That code is not valid.'}</Text> : null}
        {resendCode.isSuccess ? <Text testID="resend-success" className="mt-5 text-center text-sm" style={{ color: COLORS.oliveDark }}>A fresh code is on its way.</Text> : null}
        {resendCode.isError ? (
          <Text testID="resend-error" className="mt-5 text-center text-sm" style={{ color: COLORS.coral }}>
            {resendCode.error instanceof Error ? resendCode.error.message : 'We could not resend your code.'}
          </Text>
        ) : null}

        <View className="mt-auto items-center">
          <Text className="text-sm" style={{ color: COLORS.olive }}>Didn’t receive it?</Text>
          <Pressable testID="resend-code-button" disabled={resendCode.isPending} onPress={() => resendCode.mutate()} className="mt-2 min-h-11 justify-center px-4">
            <Text className="text-sm font-semibold" style={{ color: COLORS.coral }}>{resendCode.isPending ? 'Sending…' : 'Send another code'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
