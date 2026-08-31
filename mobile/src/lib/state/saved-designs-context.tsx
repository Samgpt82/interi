import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { SavedDesign } from '@/lib/interi';

const STORAGE_KEY = '@interi/saved-designs/v1';

interface SavedDesignsContextValue {
  designs: SavedDesign[];
  hydrated: boolean;
  saveDesign: (design: SavedDesign) => Promise<void>;
  removeDesign: (id: string) => Promise<void>;
  isSaved: (id: string) => boolean;
}

const SavedDesignsContext = createContext<SavedDesignsContextValue | null>(null);

export function SavedDesignsProvider({ children }: { children: React.ReactNode }) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setDesigns(JSON.parse(value) as SavedDesign[]);
      })
      .catch(() => setDesigns([]))
      .finally(() => setHydrated(true));
  }, []);

  const saveDesign = useCallback(async (design: SavedDesign) => {
    const next = [design, ...designs.filter((item) => item.id !== design.id)];
    setDesigns(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [designs]);

  const removeDesign = useCallback(async (id: string) => {
    const next = designs.filter((item) => item.id !== id);
    setDesigns(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [designs]);

  const isSaved = useCallback((id: string) => designs.some((item) => item.id === id), [designs]);

  const value = useMemo(
    () => ({ designs, hydrated, saveDesign, removeDesign, isSaved }),
    [designs, hydrated, isSaved, removeDesign, saveDesign],
  );

  return <SavedDesignsContext.Provider value={value}>{children}</SavedDesignsContext.Provider>;
}

export function useSavedDesigns() {
  const value = useContext(SavedDesignsContext);
  if (!value) throw new Error('useSavedDesigns must be used within SavedDesignsProvider');
  return value;
}
