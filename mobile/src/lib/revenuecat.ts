import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesError, type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

const COMMON_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'premium';
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? COMMON_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? COMMON_API_KEY,
});

export const revenueCatSupported = Platform.OS === 'ios' || Platform.OS === 'android';
export const revenueCatCustomerInfoKey = (appUserID: string) => ['revenuecat-customer-info', appUserID] as const;
export const revenueCatOfferingKey = (appUserID: string) => ['revenuecat-offering', appUserID] as const;

export type MembershipPlan = 'Free' | 'Monthly' | 'Yearly' | 'Full access';

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
  return Boolean(customerInfo?.entitlements.active[ENTITLEMENT_ID]);
}

export function getMembershipPlan(customerInfo: CustomerInfo | null | undefined): MembershipPlan {
  const activeEntitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
  const productIdentifier = activeEntitlement?.productIdentifier;

  if (!productIdentifier) return 'Free';

  const normalizedIdentifier = productIdentifier.toLowerCase();
  if (/year|annual|12[_\-. ]?month/.test(normalizedIdentifier)) return 'Yearly';
  if (/month/.test(normalizedIdentifier)) return 'Monthly';
  return 'Full access';
}

export function getMembershipStore(customerInfo: CustomerInfo | null | undefined) {
  return customerInfo?.entitlements.active[ENTITLEMENT_ID]?.store;
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

function isPurchaseCancellation(error: unknown): error is PurchasesError {
  if (!error || typeof error !== 'object') return false;
  const purchaseError = error as Partial<PurchasesError>;
  return purchaseError.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    || purchaseError.userCancelled === true;
}

function assertFullAccess(customerInfo: CustomerInfo) {
  if (!hasFullAccess(customerInfo)) {
    throw new Error('The purchase completed, but no full-access entitlement is attached to this product.');
  }
}

export async function getSubscriptionOffering(appUserID: string): Promise<PurchasesOffering> {
  if (!revenueCatSupported) throw new Error('Subscription plans are only available in the mobile app.');

  await configureRevenueCat(appUserID);
  const offerings = await Purchases.getOfferings();
  if (!offerings.current || offerings.current.availablePackages.length === 0) {
    throw new Error('No subscription plans are available right now. Please try again shortly.');
  }
  return offerings.current;
}

export async function purchaseSubscriptionPackage(appUserID: string, packageToPurchase: PurchasesPackage) {
  if (!revenueCatSupported) return { accessGranted: true, cancelled: false, customerInfo: null };

  await configureRevenueCat(appUserID);
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    assertFullAccess(customerInfo);
    return { accessGranted: true, cancelled: false, customerInfo };
  } catch (error) {
    if (!isPurchaseCancellation(error)) throw error;
    return { accessGranted: false, cancelled: true, customerInfo: null };
  }
}

export async function restoreSubscriptionPurchases(appUserID: string) {
  if (!revenueCatSupported) return { accessGranted: true, customerInfo: null };

  await configureRevenueCat(appUserID);
  const customerInfo = await Purchases.restorePurchases();
  return { accessGranted: hasFullAccess(customerInfo), customerInfo };
}

export async function manageSubscription(appUserID: string) {
  if (!revenueCatSupported) throw new Error('Subscription management is only available in the mobile app.');

  await configureRevenueCat(appUserID);
  const customerInfo = await Purchases.getCustomerInfo();
  const activeEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const activeProductIdentifier = activeEntitlement?.productIdentifier;
  const subscriptionStore = activeEntitlement?.store ?? (
    activeProductIdentifier
      ? customerInfo.subscriptionsByProductIdentifier[activeProductIdentifier]?.store
      : undefined
  );

  if (subscriptionStore === 'TEST_STORE') {
    return { customerInfo, destination: 'test-store' as const };
  }

  if (customerInfo.managementURL) {
    await Linking.openURL(customerInfo.managementURL);
    return { customerInfo, destination: 'store' as const };
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
    return { customerInfo: await Purchases.getCustomerInfo(), destination: 'customer-center' as const };
  } catch (customerCenterError) {
    if (Platform.OS !== 'ios') throw customerCenterError;
    await Purchases.showManageSubscriptions();
    return { customerInfo: await Purchases.getCustomerInfo(), destination: 'store' as const };
  }
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

export function useSubscriptionOffering(appUserID: string | undefined) {
  return useQuery({
    queryKey: revenueCatOfferingKey(appUserID ?? 'signed-out'),
    queryFn: () => getSubscriptionOffering(appUserID!),
    enabled: revenueCatSupported && Boolean(appUserID),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function usePurchaseSubscription(appUserID: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      if (!appUserID) throw new Error('Sign in before choosing a plan.');
      return purchaseSubscriptionPackage(appUserID, packageToPurchase);
    },
    onSuccess: (result) => {
      if (result.customerInfo) queryClient.setQueryData(revenueCatCustomerInfoKey(appUserID!), result.customerInfo);
    },
  });
}

export function useRestoreSubscription(appUserID: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!appUserID) throw new Error('Sign in before restoring purchases.');
      return restoreSubscriptionPurchases(appUserID);
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
    onSuccess: (result) => {
      queryClient.setQueryData(revenueCatCustomerInfoKey(appUserID!), result.customerInfo);
    },
  });
}
