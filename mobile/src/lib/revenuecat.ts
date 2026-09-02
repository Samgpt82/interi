import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

const COMMON_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? COMMON_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? COMMON_API_KEY,
});

export const revenueCatSupported = Platform.OS === 'ios' || Platform.OS === 'android';
export const revenueCatCustomerInfoKey = (appUserID: string) => ['revenuecat-customer-info', appUserID] as const;

let configurationPromise: Promise<void> | null = null;

async function configureRevenueCat(appUserID: string) {
  if (!revenueCatSupported) return;
  if (!API_KEY) throw new Error('Subscriptions are not configured for this app yet.');

  if (!configurationPromise) {
    configurationPromise = Promise.resolve()
      .then(() => Purchases.configure({ apiKey: API_KEY, appUserID }))
      .catch((error) => {
        configurationPromise = null;
        throw error;
      });
  }

  await configurationPromise;
  const currentAppUserID = await Purchases.getAppUserID();
  if (currentAppUserID !== appUserID) await Purchases.logIn(appUserID);
}

export function hasFullAccess(customerInfo: CustomerInfo | null | undefined) {
  return Boolean(customerInfo && Object.keys(customerInfo.entitlements.active).length > 0);
}

export async function initializeRevenueCatUser(appUserID: string) {
  if (!revenueCatSupported) return null;
  await configureRevenueCat(appUserID);
  return Purchases.getCustomerInfo();
}

export async function resetRevenueCatUser() {
  if (!revenueCatSupported || !configurationPromise) return;
  await configurationPromise;
  const appUserID = await Purchases.getAppUserID();
  if (!appUserID.startsWith('$RCAnonymousID:')) await Purchases.logOut();
}

export async function requestFullAccess(appUserID: string) {
  if (!revenueCatSupported) return { accessGranted: true, customerInfo: null };

  await configureRevenueCat(appUserID);
  const currentCustomerInfo = await Purchases.getCustomerInfo();
  if (hasFullAccess(currentCustomerInfo)) {
    return { accessGranted: true, customerInfo: currentCustomerInfo };
  }

  const paywallResult = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  const updatedCustomerInfo = await Purchases.getCustomerInfo();
  const accessGranted = hasFullAccess(updatedCustomerInfo);

  if (!accessGranted && (paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED)) {
    throw new Error('The purchase completed, but no full-access entitlement is attached to this product.');
  }

  return { accessGranted, customerInfo: updatedCustomerInfo };
}

export function useRevenueCatCustomerInfo(appUserID: string | undefined) {
  return useQuery({
    queryKey: revenueCatCustomerInfoKey(appUserID ?? 'signed-out'),
    queryFn: () => initializeRevenueCatUser(appUserID!),
    enabled: revenueCatSupported && Boolean(appUserID),
    staleTime: 1000 * 60,
    retry: false,
  });
}

export function useSubscriptionPaywall(appUserID: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!appUserID) throw new Error('Sign in before choosing a plan.');
      return requestFullAccess(appUserID);
    },
    onSuccess: (result) => {
      if (result.customerInfo) queryClient.setQueryData(revenueCatCustomerInfoKey(appUserID!), result.customerInfo);
    },
  });
}
