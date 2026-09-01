import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { prepareImageForUpload } from '@/lib/image-utils';
import type { DesignItem, DesignStyle, ProjectResponse, RoomType, SavedDesign, SaveProjectRequest, ShoppingCountry } from '@/lib/interi';

const LEGACY_STORAGE_KEY = '@interi/saved-designs/v1';

interface LegacySavedDesign {
  id: string;
  createdAt: string;
  sourceImageDataUrl: string;
  imageDataUrl: string;
  revisedPrompt: string;
  items?: DesignItem[];
  shoppingCountry?: ShoppingCountry;
  style: DesignStyle;
  roomType: RoomType;
}

interface SavedDesignsContextValue {
  designs: SavedDesign[];
  hydrated: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<unknown>;
  saveDesign: (design: SavedDesign) => Promise<SavedDesign>;
  removeDesign: (id: string) => Promise<void>;
  isSaved: (id: string | null) => boolean;
}

const SavedDesignsContext = createContext<SavedDesignsContextValue | null>(null);

function toSavedDesign(project: ProjectResponse): SavedDesign {
  return {
    id: project.id,
    title: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    sourceImageDataUrl: project.sourceImageUrl,
    imageDataUrl: project.imageUrl,
    revisedPrompt: project.revisedPrompt,
    items: project.items,
    shoppingCountry: project.shoppingCountry,
    style: project.style,
    roomType: project.roomType,
  };
}

export function SavedDesignsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useSession();
  const projectsQueryKey = useMemo(() => ['projects', session?.user.id ?? 'signed-out'] as const, [session?.user.id]);

  const migrationUser = useRef<string | null>(null);
  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: async () => (await api.get<ProjectResponse[]>('/api/projects')).map(toSavedDesign),
    enabled: !!session?.user,
  });

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !projectsQuery.isSuccess || migrationUser.current === userId) return;
    migrationUser.current = userId;

    const migrateLegacyDesigns = async () => {
      const migrationKey = `@interi/projects-migrated/${userId}`;
      if (await AsyncStorage.getItem(migrationKey)) return;

      const stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      const remaining = stored ? (JSON.parse(stored) as LegacySavedDesign[]) : [];
      const migrated: SavedDesign[] = [];

      while (remaining.length > 0) {
        const design = remaining[0]!;
        const request: SaveProjectRequest = {
          title: `${design.style.replaceAll('-', ' ')} ${design.roomType.replaceAll('-', ' ')}`,
          sourceImageDataUrl: await prepareImageForUpload(design.sourceImageDataUrl),
          imageDataUrl: await prepareImageForUpload(design.imageDataUrl),
          revisedPrompt: design.revisedPrompt,
          items: design.items ?? [],
          shoppingCountry: design.shoppingCountry ?? 'GB',
          style: design.style,
          roomType: design.roomType,
        };
        const saved = toSavedDesign(await api.post<ProjectResponse>('/api/projects', request));
        migrated.push(saved);
        remaining.shift();
        await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(remaining));
      }

      if (migrated.length > 0) {
        queryClient.setQueryData<SavedDesign[]>(projectsQueryKey, (current = []) => [...migrated, ...current]);
      }
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      await AsyncStorage.setItem(migrationKey, 'done');
    };

    void migrateLegacyDesigns().catch((error) => {
      migrationUser.current = null;
      console.error('Legacy project migration failed', error);
    });
  }, [projectsQuery.isSuccess, projectsQueryKey, queryClient, session?.user.id]);

  const saveMutation = useMutation({
    mutationFn: async (design: SavedDesign) => {
      const request: SaveProjectRequest = {
        title: design.title,
        sourceImageDataUrl: design.sourceImageDataUrl.startsWith('data:') ? await prepareImageForUpload(design.sourceImageDataUrl) : design.sourceImageDataUrl,
        imageDataUrl: design.imageDataUrl.startsWith('data:') ? await prepareImageForUpload(design.imageDataUrl) : design.imageDataUrl,
        revisedPrompt: design.revisedPrompt,
        items: design.items,
        shoppingCountry: design.shoppingCountry,
        style: design.style,
        roomType: design.roomType,
      };
      const project = design.id
        ? await api.put<ProjectResponse>(`/api/projects/${design.id}`, request)
        : await api.post<ProjectResponse>('/api/projects', request);
      return toSavedDesign(project);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<SavedDesign[]>(projectsQueryKey, (current = []) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete<void>(`/api/projects/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SavedDesign[]>(projectsQueryKey, (current = []) => current.filter((item) => item.id !== id));
    },
  });

  const { mutateAsync: saveDesignAsync, isPending: saving } = saveMutation;
  const { mutateAsync: removeDesignAsync } = deleteMutation;
  const saveDesign = useCallback((design: SavedDesign) => saveDesignAsync(design), [saveDesignAsync]);
  const removeDesign = useCallback((id: string) => removeDesignAsync(id), [removeDesignAsync]);
  const designs = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const isSaved = useCallback((id: string | null) => !!id && designs.some((item) => item.id === id), [designs]);
  const { refetch } = projectsQuery;
  const refresh = useCallback(() => refetch(), [refetch]);
  const error = projectsQuery.error instanceof Error ? projectsQuery.error.message : projectsQuery.isError ? 'Unable to load your projects.' : null;

  const value = useMemo(
    () => ({ designs, hydrated: !sessionLoading && !projectsQuery.isLoading, saving, error, refresh, saveDesign, removeDesign, isSaved }),
    [designs, error, isSaved, projectsQuery.isLoading, refresh, removeDesign, saveDesign, saving, sessionLoading],
  );

  return <SavedDesignsContext.Provider value={value}>{children}</SavedDesignsContext.Provider>;
}

export function useSavedDesigns() {
  const value = useContext(SavedDesignsContext);
  if (!value) throw new Error('useSavedDesigns must be used within SavedDesignsProvider');
  return value;
}
