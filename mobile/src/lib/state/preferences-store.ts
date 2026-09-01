import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ShoppingCountry } from '@/lib/interi';
import { detectShoppingCountry, type CountryDetectionMethod } from '@/lib/shopping-country';

type CountryPreference = 'automatic' | 'manual';

interface PreferencesState {
  shoppingCountry: ShoppingCountry;
  countryPreference: CountryPreference;
  detectedCountry: ShoppingCountry;
  countryDetectionMethod: CountryDetectionMethod;
  detectedRegionCode?: string;
  hydrated: boolean;
  setShoppingCountry: (shoppingCountry: ShoppingCountry) => void;
  applyDetectedCountry: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const initialSuggestion = detectShoppingCountry();

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      shoppingCountry: initialSuggestion.country,
      countryPreference: 'automatic',
      detectedCountry: initialSuggestion.country,
      countryDetectionMethod: initialSuggestion.method,
      detectedRegionCode: initialSuggestion.regionCode,
      hydrated: false,
      setShoppingCountry: (shoppingCountry) => set({ shoppingCountry, countryPreference: 'manual' }),
      applyDetectedCountry: () => set({ shoppingCountry: get().detectedCountry, countryPreference: 'automatic' }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'interi-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        shoppingCountry: state.shoppingCountry,
        countryPreference: state.countryPreference,
      }),
      migrate: (persistedState, version) => {
        const previous = persistedState as Partial<PreferencesState>;
        if (version === 0) {
          return {
            ...previous,
            countryPreference: previous.shoppingCountry === 'SE' ? 'manual' : 'automatic',
          };
        }
        return previous;
      },
      onRehydrateStorage: () => () => {
        const suggestion = detectShoppingCountry();
        const state = usePreferencesStore.getState();
        usePreferencesStore.setState({
          shoppingCountry: state.countryPreference === 'automatic' ? suggestion.country : state.shoppingCountry,
          detectedCountry: suggestion.country,
          countryDetectionMethod: suggestion.method,
          detectedRegionCode: suggestion.regionCode,
          hydrated: true,
        });
      },
    },
  ),
);
