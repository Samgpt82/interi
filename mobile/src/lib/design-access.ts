import { Platform } from 'react-native';

import { api } from '@/lib/api/api';
import type { DesignAccessMode, DesignAccessResponse } from '@/lib/interi';
import { requestFullAccess } from '@/lib/revenuecat';

export const DESIGN_ACCESS_QUERY_KEY = ['design-access'] as const;

export async function fetchDesignAccess(): Promise<DesignAccessResponse> {
  return api.get<DesignAccessResponse>('/api/design-access');
}

export async function authorizeDesignGeneration(appUserID: string): Promise<{
  accessGranted: boolean;
  accessMode: DesignAccessMode;
  designAccess: DesignAccessResponse;
}> {
  const designAccess = await fetchDesignAccess();
  if (designAccess.freeDesignsRemaining > 0) {
    return { accessGranted: true, accessMode: 'free', designAccess };
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { accessGranted: false, accessMode: 'subscription', designAccess };
  }

  const subscription = await requestFullAccess(appUserID);
  return { accessGranted: subscription.accessGranted, accessMode: 'subscription', designAccess };
}
