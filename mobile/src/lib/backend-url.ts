const DEFAULT_BACKEND_URL = 'https://api.interi.app';

export const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
