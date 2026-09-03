import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImagePlus, Settings, Sparkles, X } from '@/components/icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { IconButton, PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { imageToDataUrl } from '@/lib/image-utils';
import { COLORS } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';

export default function CreateScreen() {
  const sourceUri = useGenerationStore((state) => state.sourceImageUri);
  const setSource = useGenerationStore((state) => state.setSource);
  const reset = useGenerationStore((state) => state.reset);
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets[0]) return;
    setProcessing(true);
    setMessage(null);
    try {
      const asset = result.assets[0];
      const prepared = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1536 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      const dataUrl = await imageToDataUrl(prepared.uri, prepared.base64, 'image/jpeg');
      setSource(dataUrl, prepared.uri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not prepare that photo.');
    } finally {
      setProcessing(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Allow photo access to choose a room image.');
      return;
    }
    await handleResult(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 }));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage('Allow camera access to photograph your room.');
      return;
    }
    await handleResult(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], cameraType: ImagePicker.CameraType.back, quality: 0.9 }));
  };

  return (
    <Screen testID="create-screen">
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 124 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1"><Wordmark /></View>
          <Pressable
            testID="shopping-settings-button"
            accessibilityRole="button"
            accessibilityLabel="Shopping country settings"
            onPress={() => router.push('/settings')}
            className="ml-4 h-11 w-11 items-center justify-center rounded-full border active:opacity-60"
            style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
            <Settings size={19} color={COLORS.espresso} />
          </Pressable>
        </View>

        <View className="mt-10 max-w-[350px]">
          <Text className="text-[11px] font-semibold uppercase tracking-[3px]" style={{ color: COLORS.coral }}>Your room, reimagined</Text>
          <Text className="mt-3 text-[43px] leading-[46px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.7 }}>
            Your room, reimagined.
          </Text>
          <Text className="mt-4 text-base leading-6" style={{ color: COLORS.olive }}>
            Take a photo. Choose a style. See what your space could become.
          </Text>
        </View>

        <View className="mt-8 overflow-hidden rounded-[30px] border" style={{ height: 355, borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          {sourceUri ? (
            <>
              <Image testID="selected-room-image" source={{ uri: sourceUri }} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={250} />
              <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/35 px-5 py-4">
                <View className="flex-row items-center">
                  <Sparkles size={16} color={COLORS.white} />
                  <Text className="ml-2 text-sm font-medium" style={{ color: COLORS.white }}>Room selected</Text>
                </View>
                <Pressable testID="remove-photo-button" onPress={() => reset()} className="h-11 w-11 items-center justify-center rounded-full bg-white/90 active:scale-95">
                  <X size={19} color={COLORS.espresso} />
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              testID="empty-photo-state"
              accessibilityRole="button"
              accessibilityLabel="Choose a room photo"
              disabled={processing}
              onPress={() => void pickPhoto()}
              className="flex-1 active:opacity-90">
              <View style={{ height: 230 }}>
                <Image
                  testID="example-room-image"
                  source={require('../../../assets/room-example.jpg')}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
                <View className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-[1.5px]" style={{ color: COLORS.white }}>Room photo example</Text>
                </View>
              </View>
              <View className="flex-1 flex-row items-center px-5 py-4">
                <View className="flex-1 pr-4">
                  <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>A clear, well-lit view works best.</Text>
                  <Text className="mt-1 text-xs leading-[18px]" style={{ color: COLORS.olive }}>Include the floor, walls and main furniture.</Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.espresso }}>
                  <ImagePlus size={20} color={COLORS.white} strokeWidth={1.8} />
                </View>
              </View>
            </Pressable>
          )}
        </View>

        {message ? <Text testID="photo-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{message}</Text> : null}

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1"><IconButton icon={Camera} label="Take photo" onPress={() => void takePhoto()} testID="take-photo-button" /></View>
          <View className="flex-1"><IconButton icon={ImagePlus} label="Choose photo" onPress={() => void pickPhoto()} testID="upload-photo-button" /></View>
        </View>

        <View className="mt-5">
          <PrimaryButton label={processing ? 'Preparing image…' : 'Choose your style'} onPress={() => router.push('/style')} disabled={!sourceUri || processing} loading={processing} testID="continue-to-style-button" />
        </View>
      </ScrollView>
    </Screen>
  );
}
