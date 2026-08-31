import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ShoppingCountry } from '@/lib/interi';

interface PreferencesState {
  shoppingCountry: ShoppingCountry;
  hydrated: boolean;
  setShoppingCountry: (shoppingCountry: ShoppingCountry) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      shoppingCountry: 'GB',
      hydrated: false,
      setShoppingCountry: (shoppingCountry) => set({ shoppingCountry }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'interi-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ shoppingCountry: state.shoppingCountry }),
      onRehydrateStorage: () => () => usePreferencesStore.setState({ hydrated: true }),
    },
  ),
);
