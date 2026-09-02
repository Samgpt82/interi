import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

const COMMON_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? COMMON_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? COMMON_API_KEY,
});

export const revenueCatSupported = Platform.OS === 'ios' || Platform.OS === 'android';
export const revenueCatCustomerInfoKey = (appUserID: string) => ['revenuecat-customer-info', appUserID] as const;

export type MembershipPlan = 'Free' | 'Monthly' | 'Yearly';

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

export function getMembershipPlan(customerInfo: CustomerInfo | null | undefined): MembershipPlan {
  const activeEntitlement = customerInfo
    ? Object.values(customerInfo.entitlements.active)[0]
    : undefined;
  const productIdentifier = activeEntitlement?.productIdentifier ?? customerInfo?.activeSubscriptions[0];

  if (!productIdentifier) return 'Free';

  const normalizedIdentifier = productIdentifier.toLowerCase();
  if (/year|annual|12[_\-. ]?month/.test(normalizedIdentifier)) return 'Yearly';
  return 'Monthly';
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

export async function manageSubscription(appUserID: string) {
  if (!revenueCatSupported) throw new Error('Subscription management is only available in the mobile app.');

  await configureRevenueCat(appUserID);

  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (customerCenterError) {
    const customerInfo = await Purchases.getCustomerInfo();

    if (customerInfo.managementURL) {
      await Linking.openURL(customerInfo.managementURL);
    } else if (Platform.OS === 'ios') {
      await Purchases.showManageSubscriptions();
    } else {
      throw customerCenterError;
    }
  }

  return Purchases.getCustomerInfo();
}

export function useRevenueCatCustomerInfo(appUserID: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = revenueCatCustomerInfoKey(appUserID ?? 'signed-out');

  useEffect(() => {
    if (!revenueCatSupported || !appUserID) return;

    let listening = false;
    let cancelled = false;
    const listener = (customerInfo: CustomerInfo) => {
      queryClient.setQueryData(revenueCatCustomerInfoKey(appUserID), customerInfo);
    };

    void configureRevenueCat(appUserID)
      .then(() => {
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(listener);
        listening = true;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (listening) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [appUserID, queryClient]);

  return useQuery({
    queryKey,
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

export function useSubscriptionManagement(appUserID: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!appUserID) throw new Error('Sign in before managing your subscription.');
      return manageSubscription(appUserID);
    },
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(revenueCatCustomerInfoKey(appUserID!), customerInfo);
    },
  });
}
