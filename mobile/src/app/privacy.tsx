import { Link, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight, Mail, ShieldCheck } from '@/components/icons';
import { PublicFooter } from '@/components/PublicFooter';
import { COLORS } from '@/lib/interi';

type PolicySection = {
  number: string;
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  services?: readonly { name: string; description: string }[];
};

const POLICY_SECTIONS: readonly PolicySection[] = [
  {
    number: '01',
    title: 'Information we collect',
    paragraphs: [
      'We collect information you provide to us and information created when you use Interi. The information we collect depends on how you use the app.',
    ],
    bullets: [
      'Email address and account information used to create and manage your account.',
      'A unique user ID used to connect your account, designs, and subscription access.',
      'Photos and images of rooms that you choose to upload.',
      'Design choices, prompts, refinements, generated room designs, saved projects, folders, and related content you create in Interi.',
      'Subscription and purchase information, such as product, entitlement, subscription status, and purchase or restoration records. We do not receive your full payment-card details from Apple.',
      'Limited technical and session information, such as IP address and user-agent information, used for authentication, security, and reliable operation of the service.',
    ],
  },
  {
    number: '02',
    title: 'How we use information',
    paragraphs: ['We use the information described above to:'],
    bullets: [
      'Provide, operate, maintain, and improve Interi.',
      'Authenticate users and keep accounts connected to the correct content.',
      'Process room photos and instructions to generate AI interior-design transformations.',
      'Save, organize, and display generated designs and related content when you choose to save them.',
      'Provide subscription access, confirm entitlements, and restore purchases.',
      'Respond to questions, support requests, and account or data-deletion requests.',
      'Protect Interi, prevent misuse, troubleshoot problems, and maintain the security and reliability of the service.',
    ],
  },
  {
    number: '03',
    title: 'Photos and AI processing',
    paragraphs: [
      'Interi lets you upload a photo of a room and choose design preferences. The image, your selections, and any refinement instructions are sent to Interi’s backend and processed by the AI service used by Interi to create the requested room transformation. Generated results may also be processed to review image quality and identify design items shown in the result.',
      'Only upload photos that you have the right to use. Avoid uploading images that contain people, sensitive documents, or other personal information that is not needed for the design request.',
    ],
  },
  {
    number: '04',
    title: 'Third-party services',
    paragraphs: [
      'Interi uses service providers to perform specific functions. These providers process information on our behalf or under their own terms, as applicable.',
    ],
    services: [
      {
        name: 'RevenueCat',
        description:
          'Interi uses RevenueCat to manage subscription offerings, purchase status, entitlements, and purchase restoration. RevenueCat may receive your Interi user ID and information related to your subscription.',
      },
      {
        name: 'Apple and the App Store',
        description:
          'Purchases and subscription payments made in the iOS app are processed by Apple through the App Store. Apple handles payment information and store transactions under Apple’s own terms and privacy practices.',
      },
      {
        name: 'OpenAI',
        description:
          'Interi’s backend uses OpenAI as its AI processing service. Room images, design instructions, and generated results may be sent to OpenAI as needed to generate and review your requested design and produce related design information.',
      },
      {
        name: 'Infrastructure providers',
        description:
          'Interi also relies on service providers for functions such as app hosting, image storage, database operation, and delivery of authentication emails. They receive only the information needed to provide those services.',
      },
    ],
  },
  {
    number: '05',
    title: 'Data retention and deletion',
    paragraphs: [
      'Account information and saved designs are generally retained while your account remains active or for as long as needed to provide Interi. You can delete individual saved projects in the app; doing so also removes the stored project images associated with that project.',
      'Temporary files and records for completed AI generation jobs are scheduled for cleanup after approximately seven days. A design that you deliberately save to your account is retained as a saved project instead.',
      'To request deletion of your account and associated data, email support@interi.app from the email address connected to your account. We may need to verify your identity before completing the request. Some information may be retained where reasonably necessary for security, dispute resolution, or compliance with legal obligations.',
    ],
  },
  {
    number: '06',
    title: 'Subscriptions and payments',
    paragraphs: [
      'Subscriptions purchased in the iOS app are processed through Apple’s App Store. Apple is responsible for payment processing, billing, renewals, and applicable refunds under its terms. Interi uses RevenueCat to receive and manage subscription status and entitlements, including restoring eligible purchases. You can manage or cancel an App Store subscription through your Apple account settings.',
    ],
  },
  {
    number: '07',
    title: 'Security',
    paragraphs: [
      'We use reasonable technical and organizational measures designed to protect user information, including account authentication, access controls, secure network connections, and limiting access to information to what is needed to operate the service. No system or method of transmission is completely secure, so we cannot guarantee absolute security.',
    ],
  },
  {
    number: '08',
    title: "Children's privacy",
    paragraphs: [
      'Interi is not directed to children. You should use Interi only if you are legally able to consent to the processing described in this policy, or if a parent or legal guardian has provided the consent required where you live. If you believe a child has provided personal information to Interi without appropriate permission, contact us so we can review and address the request.',
    ],
  },
  {
    number: '09',
    title: 'International data transfers',
    paragraphs: [
      'Interi and its service providers may process and store information in countries other than the country where you live. Those countries may have different data-protection laws. Where applicable, we take reasonable steps intended to ensure that information remains protected when it is transferred or processed internationally.',
    ],
  },
  {
    number: '10',
    title: 'Changes to this Privacy Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect changes to Interi, our service providers, or applicable requirements. The updated version will be posted on this page, and the “Last updated” date will be revised.',
    ],
  },
  {
    number: '11',
    title: 'Contact',
    paragraphs: [
      'For privacy questions, account-deletion requests, or other questions about how Interi handles information, contact support@interi.app.',
    ],
  },
];

export default function PrivacyScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const contactPrivacy = () => {
    void Linking.openURL('mailto:support@interi.app?subject=Interi%20Privacy%20Request');
  };

  return (
    <SafeAreaView testID="privacy-screen" edges={['top']} style={{ flex: 1, backgroundColor: COLORS.chalk }}>
      <Stack.Screen options={{ title: 'Interi Privacy Policy', headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="relative overflow-hidden">
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: isDesktop ? -90 : -170,
              top: isDesktop ? -210 : -190,
              width: isDesktop ? 500 : 360,
              height: isDesktop ? 500 : 360,
              borderRadius: 999,
              backgroundColor: '#E8DDCD',
              opacity: 0.72,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: isDesktop ? -190 : -230,
              bottom: isDesktop ? -210 : -170,
              width: 390,
              height: 390,
              borderRadius: 999,
              backgroundColor: '#E6D2C5',
              opacity: 0.4,
            }}
          />

          <View
            className="w-full px-6"
            style={{ maxWidth: 1180, alignSelf: 'center', paddingTop: isDesktop ? 34 : 22 }}>
            <View className="flex-row items-center justify-between">
              <Link href="/" asChild>
                <Pressable
                  testID="privacy-home-link"
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
                <ShieldCheck size={14} color={COLORS.oliveDark} />
                <Text className="ml-2 text-[10px] font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.oliveDark }}>
                  Privacy
                </Text>
              </View>
            </View>

            <View style={{ paddingTop: isDesktop ? 96 : 62, paddingBottom: isDesktop ? 104 : 70 }}>
              <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
                Privacy Policy
              </Text>
              <Text
                style={{
                  marginTop: 16,
                  maxWidth: 760,
                  color: COLORS.espresso,
                  fontFamily: 'Georgia',
                  fontSize: isDesktop ? 70 : 46,
                  lineHeight: isDesktop ? 75 : 51,
                  letterSpacing: isDesktop ? -3 : -1.9,
                }}>
                Your room. Your ideas. Handled thoughtfully.
              </Text>
              <Text
                style={{
                  marginTop: 24,
                  maxWidth: 700,
                  color: COLORS.oliveDark,
                  fontSize: isDesktop ? 18 : 16,
                  lineHeight: isDesktop ? 29 : 25,
                }}>
                This Privacy Policy explains how Interi handles information when you use our AI-powered interior design app and related website.
              </Text>
              <View
                className="mt-8 rounded-full border px-4 py-2.5"
                style={{ alignSelf: 'flex-start', borderColor: COLORS.line, backgroundColor: 'rgba(251,248,241,0.72)' }}>
                <Text className="text-xs font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.oliveDark }}>
                  Last updated · September 21, 2026
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: COLORS.paper }}>
          <View
            className="w-full px-6"
            style={{ maxWidth: 1180, alignSelf: 'center', paddingVertical: isDesktop ? 100 : 68 }}>
            <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 86 : 46, alignItems: 'flex-start' }}>
              <View style={{ width: isDesktop ? 280 : '100%' }}>
                <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>
                  At a glance
                </Text>
                <Text
                  style={{
                    marginTop: 15,
                    color: COLORS.espresso,
                    fontFamily: 'Georgia',
                    fontSize: isDesktop ? 34 : 30,
                    lineHeight: isDesktop ? 41 : 37,
                    letterSpacing: -1.1,
                  }}>
                  Privacy is part of the design.
                </Text>
                <Text className="mt-5 text-[15px] leading-[24px]" style={{ color: COLORS.oliveDark }}>
                  Interi uses your account details, room imagery, design content, and subscription status to deliver the features you request.
                </Text>

                <Pressable
                  testID="privacy-contact-button"
                  accessibilityRole="link"
                  accessibilityLabel="Email Interi about privacy"
                  onPress={contactPrivacy}
                  className="mt-7 min-h-12 flex-row items-center justify-center rounded-full px-5 active:scale-[0.98]"
                  style={{ backgroundColor: COLORS.coral }}>
                  <Mail size={17} color={COLORS.white} />
                  <Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.white }}>
                    Privacy questions
                  </Text>
                  <ArrowRight size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
                </Pressable>
              </View>

              <View testID="privacy-policy-content" className="flex-1 border-t" style={{ borderColor: COLORS.line }}>
                {POLICY_SECTIONS.map((section) => (
                  <View
                    key={section.number}
                    testID={`privacy-section-${section.number}`}
                    className="border-b"
                    style={{ borderColor: COLORS.line, paddingVertical: isDesktop ? 34 : 28 }}>
                    <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 26 : 9 }}>
                      <Text
                        className="text-[11px] font-semibold tracking-[2px]"
                        style={{ color: COLORS.coral, minWidth: 34, paddingTop: isDesktop ? 7 : 0 }}>
                        {section.number}
                      </Text>
                      <View className="flex-1">
                        <Text
                          style={{
                            color: COLORS.espresso,
                            fontFamily: 'Georgia',
                            fontSize: isDesktop ? 28 : 24,
                            lineHeight: isDesktop ? 35 : 31,
                            letterSpacing: -0.6,
                          }}>
                          {section.title}
                        </Text>

                        {section.paragraphs?.map((paragraph) => (
                          <Text
                            key={paragraph}
                            selectable
                            className="mt-4 text-[15px] leading-[25px]"
                            style={{ color: COLORS.oliveDark }}>
                            {paragraph}
                          </Text>
                        ))}

                        {section.bullets ? (
                          <View className="mt-3 gap-3">
                            {section.bullets.map((bullet) => (
                              <View key={bullet} className="flex-row" style={{ gap: 12 }}>
                                <View className="mt-[10px] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.coral }} />
                                <Text selectable className="flex-1 text-[15px] leading-[24px]" style={{ color: COLORS.oliveDark }}>
                                  {bullet}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {section.services ? (
                          <View className="mt-5 gap-4">
                            {section.services.map((service) => (
                              <View
                                key={service.name}
                                className="rounded-[22px] border p-5"
                                style={{ borderColor: COLORS.line, backgroundColor: COLORS.chalk }}>
                                <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>
                                  {service.name}
                                </Text>
                                <Text selectable className="mt-2 text-[14px] leading-[23px]" style={{ color: COLORS.oliveDark }}>
                                  {service.description}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {section.number === '11' ? (
                          <Pressable
                            testID="privacy-email-link"
                            accessibilityRole="link"
                            onPress={contactPrivacy}
                            className="mt-5 self-start border-b pb-1 active:opacity-60"
                            style={{ borderColor: COLORS.coral }}>
                            <Text selectable className="text-[15px] font-semibold" style={{ color: COLORS.coral }}>
                              support@interi.app
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
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
