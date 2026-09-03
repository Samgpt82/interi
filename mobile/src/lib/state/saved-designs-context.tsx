import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { api, isApiError } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { prepareImageForUpload } from '@/lib/image-utils';
import type {
  AppendProjectVersionRequest,
  CreateFolderRequest,
  DesignItem,
  DesignStyle,
  FolderResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  ProjectVersionResponse,
  RoomType,
  SaveProjectRequest,
  ShoppingCountry,
  UpdateProjectRequest,
} from '@/lib/interi';

const LEGACY_STORAGE_KEY = '@interi/saved-designs/v1';

function createClientRequestId(kind: 'folder' | 'project' | 'version') {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const TRANSIENT_WRITE_STATUSES = new Set([502, 503, 504]);
const RECONCILIATION_DELAYS_MS = [300, 900, 1800];

function isTransientWriteFailure(error: unknown) {
  return !isApiError(error) || TRANSIENT_WRITE_STATUSES.has(error.status);
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function performRecoverableWrite<T>(write: () => Promise<T>, lookup: () => Promise<T | null>): Promise<T> {
  let lastError: unknown;

  for (let writeAttempt = 0; writeAttempt < 2; writeAttempt += 1) {
    try {
      return await write();
    } catch (error) {
      if (!isTransientWriteFailure(error)) throw error;
      lastError = error;
    }

    for (const delay of RECONCILIATION_DELAYS_MS) {
      await wait(delay);
      try {
        const savedValue = await lookup();
        if (savedValue) return savedValue;
      } catch (error) {
        if (isApiError(error) && error.status === 404) continue;
        if (!isTransientWriteFailure(error)) throw error;
      }
    }
  }

  if (isApiError(lastError) && !lastError.code) {
    throw new Error('The connection was interrupted while saving. Refresh My Designs before trying again.');
  }
  throw lastError;
}

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
  designs: ProjectSummaryResponse[];
  folders: FolderResponse[];
  hydrated: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<unknown>;
  fetchProjectDetail: (id: string) => Promise<ProjectDetailResponse>;
  createProject: (request: SaveProjectRequest) => Promise<ProjectDetailResponse>;
  appendProjectVersion: (projectId: string, request: AppendProjectVersionRequest) => Promise<ProjectVersionResponse>;
  moveProject: (projectId: string, folderId: string | null) => Promise<ProjectDetailResponse>;
  updateProject: (projectId: string, request: UpdateProjectRequest) => Promise<ProjectDetailResponse>;
  removeDesign: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<FolderResponse>;
  renameFolder: (id: string, name: string) => Promise<FolderResponse>;
  removeFolder: (id: string) => Promise<void>;
  isSaved: (id: string | null) => boolean;
}

const SavedDesignsContext = createContext<SavedDesignsContextValue | null>(null);

async function prepareContent<T extends SaveProjectRequest | AppendProjectVersionRequest>(request: T): Promise<T> {
  return {
    ...request,
    sourceImageDataUrl: await prepareImageForUpload(request.sourceImageDataUrl),
    imageDataUrl: await prepareImageForUpload(request.imageDataUrl),
  };
}

export function SavedDesignsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useSession();
  const userKey = session?.user.id ?? 'signed-out';
  const projectsQueryKey = useMemo(() => ['projects', userKey] as const, [userKey]);
  const foldersQueryKey = useMemo(() => ['folders', userKey] as const, [userKey]);
  const migrationUser = useRef<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: () => api.get<ProjectSummaryResponse[]>('/api/projects'),
    enabled: !!session?.user,
  });
  const foldersQuery = useQuery({
    queryKey: foldersQueryKey,
    queryFn: () => api.get<FolderResponse[]>('/api/folders'),
    enabled: !!session?.user,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (request: SaveProjectRequest) => {
      const clientRequestId = request.clientRequestId ?? createClientRequestId('project');
      const body = { ...await prepareContent(request), clientRequestId };
      return performRecoverableWrite(
        () => api.post<ProjectDetailResponse>('/api/projects', body),
        () => api.get<ProjectDetailResponse>(`/api/projects/${clientRequestId}`),
      );
    },
    onSuccess: (project) => {
      queryClient.setQueryData<ProjectSummaryResponse[]>(projectsQueryKey, (current = []) => [project, ...current.filter((item) => item.id !== project.id)]);
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
    },
  });
  const appendVersionMutation = useMutation({
    mutationFn: async ({ projectId, request }: { projectId: string; request: AppendProjectVersionRequest }) => {
      const clientRequestId = request.clientRequestId ?? createClientRequestId('version');
      const body = { ...await prepareContent(request), clientRequestId };
      return performRecoverableWrite(
        () => api.post<ProjectVersionResponse>(`/api/projects/${projectId}/versions`, body),
        async () => {
          const project = await api.get<ProjectDetailResponse>(`/api/projects/${projectId}`);
          return project.versions.find((version) => version.id === clientRequestId) ?? null;
        },
      );
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['project', userKey, variables.projectId] });
    },
  });
  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, request }: { projectId: string; request: UpdateProjectRequest }) => api.patch<ProjectDetailResponse>(`/api/projects/${projectId}`, request),
    onSuccess: (project) => {
      queryClient.setQueryData<ProjectSummaryResponse[]>(projectsQueryKey, (current = []) => current.map((item) => (item.id === project.id ? project : item)));
      queryClient.setQueryData(['project', userKey, project.id], project);
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
    },
  });
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/projects/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ProjectSummaryResponse[]>(projectsQueryKey, (current = []) => current.filter((item) => item.id !== id));
      void queryClient.invalidateQueries({ queryKey: foldersQueryKey });
    },
  });
  const createFolderMutation = useMutation({
    mutationFn: (request: CreateFolderRequest) => {
      const clientRequestId = request.clientRequestId ?? createClientRequestId('folder');
      const body = { ...request, clientRequestId };
      return performRecoverableWrite(
        () => api.post<FolderResponse>('/api/folders', body),
        () => api.get<FolderResponse>(`/api/folders/${clientRequestId}`),
      );
    },
    onSuccess: (folder) => queryClient.setQueryData<FolderResponse[]>(foldersQueryKey, (current = []) => [...current.filter((item) => item.id !== folder.id), folder].sort((a, b) => a.name.localeCompare(b.name))),
  });
  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch<FolderResponse>(`/api/folders/${id}`, { name }),
    onSuccess: (folder) => queryClient.setQueryData<FolderResponse[]>(foldersQueryKey, (current = []) => current.map((item) => (item.id === folder.id ? folder : item)).sort((a, b) => a.name.localeCompare(b.name))),
  });
  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/folders/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<FolderResponse[]>(foldersQueryKey, (current = []) => current.filter((item) => item.id !== id));
      queryClient.setQueryData<ProjectSummaryResponse[]>(projectsQueryKey, (current = []) => current.map((project) => project.folder?.id === id ? { ...project, folder: null } : project));
    },
  });

  const { mutateAsync: createProjectAsync } = createProjectMutation;
  const { mutateAsync: appendVersionAsync } = appendVersionMutation;
  const { mutateAsync: updateProjectAsync } = updateProjectMutation;
  const { mutateAsync: deleteProjectAsync } = deleteProjectMutation;
  const { mutateAsync: createFolderAsync } = createFolderMutation;
  const { mutateAsync: renameFolderAsync } = renameFolderMutation;
  const { mutateAsync: deleteFolderAsync } = deleteFolderMutation;
  const { refetch: refetchProjects } = projectsQuery;
  const { refetch: refetchFolders } = foldersQuery;
  const createProject = useCallback((request: SaveProjectRequest) => createProjectAsync(request), [createProjectAsync]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !projectsQuery.isSuccess || migrationUser.current === userId) return;
    migrationUser.current = userId;
    const migrateLegacyDesigns = async () => {
      const migrationKey = `@interi/projects-migrated/${userId}`;
      if (await AsyncStorage.getItem(migrationKey)) return;
      const stored = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      const remaining = stored ? (JSON.parse(stored) as LegacySavedDesign[]) : [];
      while (remaining.length > 0) {
        const design = remaining[0]!;
        await createProject({
          title: `${design.style.replaceAll('-', ' ')} ${design.roomType.replaceAll('-', ' ')}`,
          sourceImageDataUrl: design.sourceImageDataUrl,
          imageDataUrl: design.imageDataUrl,
          revisedPrompt: design.revisedPrompt,
          items: design.items ?? [],
          shoppingCountry: design.shoppingCountry ?? 'GB',
          style: design.style,
          roomType: design.roomType,
          folderId: null,
        });
        remaining.shift();
        await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(remaining));
      }
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      await AsyncStorage.setItem(migrationKey, 'done');
    };
    void migrateLegacyDesigns().catch((error) => { migrationUser.current = null; console.error('Legacy project migration failed', error); });
  }, [createProject, projectsQuery.isSuccess, session?.user.id]);

  const fetchProjectDetail = useCallback(async (id: string) => {
    const project = await api.get<ProjectDetailResponse>(`/api/projects/${id}`);
    queryClient.setQueryData(['project', userKey, id], project);
    return project;
  }, [queryClient, userKey]);
  const appendProjectVersion = useCallback((projectId: string, request: AppendProjectVersionRequest) => appendVersionAsync({ projectId, request }), [appendVersionAsync]);
  const updateProject = useCallback((projectId: string, request: UpdateProjectRequest) => updateProjectAsync({ projectId, request }), [updateProjectAsync]);
  const moveProject = useCallback((projectId: string, folderId: string | null) => updateProject(projectId, { folderId }), [updateProject]);
  const removeDesign = useCallback((id: string) => deleteProjectAsync(id), [deleteProjectAsync]);
  const createFolder = useCallback((name: string) => createFolderAsync({ name: name.trim() }), [createFolderAsync]);
  const renameFolder = useCallback((id: string, name: string) => renameFolderAsync({ id, name: name.trim() }), [renameFolderAsync]);
  const removeFolder = useCallback((id: string) => deleteFolderAsync(id), [deleteFolderAsync]);
  const designs = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const isSaved = useCallback((id: string | null) => !!id && designs.some((item) => item.id === id), [designs]);
  const refresh = useCallback(async () => Promise.all([refetchProjects(), refetchFolders()]), [refetchFolders, refetchProjects]);
  const errorObject = projectsQuery.error ?? foldersQuery.error;
  const error = errorObject instanceof Error ? errorObject.message : (projectsQuery.isError || foldersQuery.isError ? 'Unable to load your projects.' : null);
  const saving = createProjectMutation.isPending || appendVersionMutation.isPending || updateProjectMutation.isPending;

  const value = useMemo<SavedDesignsContextValue>(() => ({
    designs, folders, hydrated: !sessionLoading && !projectsQuery.isLoading && !foldersQuery.isLoading, saving, error, refresh,
    fetchProjectDetail, createProject, appendProjectVersion, moveProject, updateProject, removeDesign, createFolder, renameFolder, removeFolder, isSaved,
  }), [appendProjectVersion, createFolder, createProject, designs, error, fetchProjectDetail, folders, foldersQuery.isLoading, isSaved, moveProject, projectsQuery.isLoading, refresh, removeDesign, removeFolder, renameFolder, saving, sessionLoading, updateProject]);

  return <SavedDesignsContext.Provider value={value}>{children}</SavedDesignsContext.Provider>;
}

export function useSavedDesigns() {
  const value = useContext(SavedDesignsContext);
  if (!value) throw new Error('useSavedDesigns must be used within SavedDesignsProvider');
  return value;
}
