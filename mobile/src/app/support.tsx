import { LinearGradient } from 'expo-linear-gradient';
import { Link, Stack } from 'expo-router';
import { ArrowRight, Mail, Sparkles } from '@/components/icons';
import React from 'react';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PublicFooter } from '@/components/PublicFooter';
import { COLORS } from '@/lib/interi';

const QUESTIONS = [
  {
    number: '01',
    title: "My subscription isn't working",
    answer:
      "Please make sure you're signed in with the Apple ID used to purchase the subscription. You can also use Restore Purchases inside the app.",
  },
  {
    number: '02',
    title: "I purchased Pro but don't have access",
    answer:
      'Open the app and select Restore Purchases. If the problem continues, contact us by email.',
  },
  {
    number: '03',
    title: 'I found a problem with the app',
    answer:
      'Please include your device model, iOS version, and a description or screenshot of the problem.',
  },
] as const;

export default function SupportScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const contactSupport = () => {
    void Linking.openURL('mailto:support@interi.app?subject=Interi%20Support');
  };

  return (
    <SafeAreaView testID="support-screen" edges={['top']} style={{ flex: 1, backgroundColor: COLORS.chalk }}>
      <Stack.Screen options={{ title: 'Interi Support', headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="relative overflow-hidden">
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: isDesktop ? -110 : -150,
              top: isDesktop ? -180 : -210,
              width: isDesktop ? 470 : 360,
              height: isDesktop ? 470 : 360,
              borderRadius: 999,
              backgroundColor: '#E8DDCD',
              opacity: 0.72,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: isDesktop ? -190 : -220,
              top: isDesktop ? 390 : 490,
              width: 390,
              height: 390,
              borderRadius: 999,
              backgroundColor: '#E6D2C5',
              opacity: 0.42,
            }}
          />

          <View
            className="w-full px-6"
            style={{ maxWidth: 1180, alignSelf: 'center', paddingTop: isDesktop ? 34 : 22 }}>
            <View className="flex-row items-center justify-between">
              <Link href="/" asChild>
                <Pressable
                  testID="support-home-link"
                  accessibilityRole="link"
                  className="min-h-11 justify-center active:opacity-60">
                  <Text
                    style={{
                      color: COLORS.espresso,
                      fontFamily: 'Georgia',
                      fontSize: isDesktop ? 36 : 32,
                      letterSpacing: -1.3,
                    }}>
                    interi
                  </Text>
                </Pressable>
              </Link>
              <View className="flex-row items-center rounded-full px-3 py-2" style={{ backgroundColor: '#E8E0D3' }}>
                <Sparkles size={13} color={COLORS.oliveDark} />
                <Text className="ml-2 text-[10px] font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.oliveDark }}>
                  Support studio
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: isDesktop ? 72 : 34,
                paddingTop: isDesktop ? 92 : 58,
                paddingBottom: isDesktop ? 96 : 64,
                alignItems: isDesktop ? 'center' : 'stretch',
              }}>
              <View style={{ flex: isDesktop ? 1.15 : undefined }}>
                <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
                  Interi Support
                </Text>
                <Text
                  style={{
                    marginTop: 16,
                    maxWidth: 610,
                    color: COLORS.espresso,
                    fontFamily: 'Georgia',
                    fontSize: isDesktop ? 68 : 46,
                    lineHeight: isDesktop ? 72 : 50,
                    letterSpacing: isDesktop ? -2.8 : -1.9,
                  }}>
                  We&apos;re here to help.
                </Text>
                <Text
                  style={{
                    marginTop: 22,
                    maxWidth: 590,
                    color: COLORS.oliveDark,
                    fontSize: isDesktop ? 18 : 16,
                    lineHeight: isDesktop ? 29 : 25,
                  }}>
                  If you have questions, encounter a problem, or have feedback about Interi, please contact us.
                </Text>
              </View>

              <View
                testID="support-contact-card"
                className="overflow-hidden rounded-[30px] border"
                style={{
                  flex: isDesktop ? 0.85 : undefined,
                  maxWidth: isDesktop ? 430 : undefined,
                  borderColor: COLORS.line,
                  backgroundColor: COLORS.paper,
                  shadowColor: COLORS.espresso,
                  shadowOffset: { width: 0, height: 16 },
                  shadowOpacity: 0.1,
                  shadowRadius: 30,
                  elevation: 4,
                }}>
                <LinearGradient
                  colors={['rgba(242,107,77,0.13)', 'rgba(251,248,241,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: isDesktop ? 34 : 26 }}>
                  <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#F7DFD7' }}>
                    <Mail size={21} color={COLORS.coral} />
                  </View>
                  <Text className="mt-7 text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.olive }}>
                    Contact Support
                  </Text>
                  <Text
                    selectable
                    style={{
                      marginTop: 9,
                      color: COLORS.espresso,
                      fontFamily: 'Georgia',
                      fontSize: isDesktop ? 25 : 22,
                    }}>
                    support@interi.app
                  </Text>
                  <Text className="mt-3 text-sm leading-[21px]" style={{ color: COLORS.olive }}>
                    We aim to respond to support requests as soon as possible.
                  </Text>
                  <Pressable
                    testID="contact-support-button"
                    accessibilityRole="link"
                    accessibilityLabel="Email Interi Support"
                    onPress={contactSupport}
                    className="mt-7 min-h-14 flex-row items-center justify-center rounded-full px-5 active:scale-[0.98]"
                    style={{ backgroundColor: COLORS.coral }}>
                    <Text className="text-[15px] font-semibold" style={{ color: COLORS.white }}>
                      Email support
                    </Text>
                    <ArrowRight size={17} color={COLORS.white} style={{ marginLeft: 9 }} />
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: COLORS.paper }}>
          <View
            className="w-full px-6"
            style={{ maxWidth: 1180, alignSelf: 'center', paddingVertical: isDesktop ? 100 : 68 }}>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 88 : 58 }}>
              <View style={{ flex: isDesktop ? 0.75 : undefined }}>
                <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
                  About Interi
                </Text>
                <Text
                  style={{
                    marginTop: 16,
                    color: COLORS.espresso,
                    fontFamily: 'Georgia',
                    fontSize: isDesktop ? 38 : 32,
                    lineHeight: isDesktop ? 45 : 39,
                    letterSpacing: -1.2,
                  }}>
                  Design ideas, made tangible.
                </Text>
                <Text className="mt-5 text-[15px] leading-[25px]" style={{ color: COLORS.oliveDark }}>
                  Interi is an AI-powered interior design app that helps you explore room designs, experiment with different styles, and refine your space.
                </Text>
              </View>

              <View style={{ flex: isDesktop ? 1.25 : undefined }}>
                <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
                  Common questions
                </Text>
                <View className="mt-4 border-t" style={{ borderColor: COLORS.line }}>
                  {QUESTIONS.map((question) => (
                    <View
                      key={question.number}
                      testID={`support-question-${question.number}`}
                      className="border-b py-6"
                      style={{ borderColor: COLORS.line }}>
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 24 : 8 }}>
                        <Text className="text-[11px] font-semibold tracking-[2px]" style={{ color: COLORS.coral, minWidth: 34 }}>
                          {question.number}
                        </Text>
                        <View className="flex-1">
                          <Text
                            style={{
                              color: COLORS.espresso,
                              fontFamily: 'Georgia',
                              fontSize: isDesktop ? 22 : 20,
                              lineHeight: 28,
                            }}>
                            {question.title}
                          </Text>
                          <Text className="mt-3 text-[15px] leading-[24px]" style={{ color: COLORS.oliveDark }}>
                            {question.answer}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6" style={{ backgroundColor: COLORS.chalk }}>
          <PublicFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
