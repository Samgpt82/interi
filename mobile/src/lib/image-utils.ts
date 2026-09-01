import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

function extensionForMime(mimeType: string) {
  return mimeType.includes('png') ? 'png' : 'jpg';
}

export async function imageToDataUrl(uri: string, base64?: string | null, mimeType = 'image/jpeg') {
  if (uri.startsWith('data:')) return uri;
  if (base64) return `data:${mimeType};base64,${base64}`;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read this image.'));
      reader.readAsDataURL(blob);
    });
  }

  const encoded = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:${mimeType};base64,${encoded}`;
}

async function dataUrlToCacheFile(imageUri: string) {
  const match = imageUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (match) {
    const [, mimeType, base64] = match;
    const uri = `${FileSystem.cacheDirectory}interi-${Date.now()}.${extensionForMime(mimeType)}`;
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return { uri, mimeType };
  }

  if (/^https?:\/\//.test(imageUri)) {
    const uri = `${FileSystem.cacheDirectory}interi-${Date.now()}.jpg`;
    const download = await FileSystem.downloadAsync(imageUri, uri);
    if (download.status < 200 || download.status >= 300) {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      throw new Error('The saved project image is temporarily unavailable.');
    }
    return { uri: download.uri, mimeType: download.headers['Content-Type'] ?? 'image/jpeg' };
  }

  throw new Error('The generated image format is not supported.');
}

export async function prepareImageForUpload(dataUrl: string) {
  let objectUrl: string | null = null;

  try {
    if (Platform.OS === 'web') {
      const response = await fetch(dataUrl);
      objectUrl = URL.createObjectURL(await response.blob());
    }

    const inputUri = objectUrl ?? (await dataUrlToCacheFile(dataUrl)).uri;
    const prepared = await ImageManipulator.manipulateAsync(
      inputUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return imageToDataUrl(prepared.uri, prepared.base64, 'image/jpeg');
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export async function saveImageToLibrary(dataUrl: string) {
  if (Platform.OS === 'web') {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `interi-design-${Date.now()}.jpg`;
    anchor.click();
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library access is needed to save this design.');
  const file = await dataUrlToCacheFile(dataUrl);
  await MediaLibrary.createAssetAsync(file.uri);
}

export async function shareImage(dataUrl: string) {
  if (Platform.OS === 'web') {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'interi-design.jpg', { type: blob.type || 'image/jpeg' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'My Interi redesign' });
      return;
    }
    await Share.share({ message: 'My Interi redesign', url: dataUrl });
    return;
  }

  const file = await dataUrlToCacheFile(dataUrl);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: file.mimeType, dialogTitle: 'Share your Interi redesign' });
  } else {
    await Share.share({ message: 'My Interi redesign', url: file.uri });
  }
}
