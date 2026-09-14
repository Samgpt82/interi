import { Platform } from 'react-native';

import { api } from '@/lib/api/api';
import type { DesignAccessMode, DesignAccessResponse } from '@/lib/interi';
import { hasFullAccess, initializeRevenueCatUser } from '@/lib/revenuecat';

export const DESIGN_ACCESS_QUERY_KEY = ['design-access'] as const;

export async function fetchDesignAccess(): Promise<DesignAccessResponse> {
  return api.get<DesignAccessResponse>('/api/design-access');
}

export interface DesignGenerationAuthorization {
  accessGranted: boolean;
  accessMode: DesignAccessMode;
  designAccess: DesignAccessResponse;
}

export async function checkDesignGenerationAccess(appUserID: string): Promise<DesignGenerationAuthorization> {
  const designAccess = await fetchDesignAccess();
  if (designAccess.freeDesignsRemaining > 0) {
    return { accessGranted: true, accessMode: 'free', designAccess };
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { accessGranted: false, accessMode: 'subscription', designAccess };
  }

  const customerInfo = await initializeRevenueCatUser(appUserID);
  return { accessGranted: hasFullAccess(customerInfo), accessMode: 'subscription', designAccess };
}

export async function authorizeDesignGeneration(appUserID: string): Promise<DesignGenerationAuthorization> {
  return checkDesignGenerationAccess(appUserID);
}
