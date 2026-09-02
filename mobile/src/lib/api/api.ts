import { fetch } from "expo/fetch";

import { authClient } from "../auth/auth-client";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
    code?: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;

const request = async <T>(
  url: string,
  options: { method?: string; body?: string } = {}
): Promise<T> => {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  // 1. Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // 2. JSON responses: surface API errors, then unwrap { data }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = (await response.json()) as ApiResponse<T> & ApiErrorResponse;
    if (!response.ok) {
      throw new ApiError(
        json.error?.message ?? `Request failed (${response.status})`,
        response.status,
        json.error?.code
      );
    }
    return json.data;
  }

  // 3. Non-JSON errors still need to reject mutations
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }
  return undefined as T;
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
