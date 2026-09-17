import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { BACKEND_URL } from '@/lib/backend-url';

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    expoClient({
      scheme: 'vibecode',
      storagePrefix: 'interi',
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
