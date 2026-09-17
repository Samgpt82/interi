import { fetch } from "expo/fetch";
import { Platform } from "react-native";

import { BACKEND_URL } from "../backend-url";
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

interface RequestOptions {
  method?: string;
  body?: string;
  retryTransient?: boolean;
}

const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504]);
const TRANSIENT_RETRY_DELAYS_MS = [350, 900];

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const request = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const { retryTransient = (options.method ?? "GET") === "GET", ...fetchOptions } = options;
  const cookie = Platform.OS === "web" ? null : await authClient.getCookie();

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(`${BACKEND_URL}${url}`, {
        ...fetchOptions,
        credentials: "include",
        headers: {
          ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });

      if (retryTransient && TRANSIENT_GATEWAY_STATUSES.has(response.status) && attempt < TRANSIENT_RETRY_DELAYS_MS.length) {
        await wait(TRANSIENT_RETRY_DELAYS_MS[attempt]!);
        continue;
      }

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
    } catch (error) {
      if (error instanceof ApiError || !retryTransient || attempt >= TRANSIENT_RETRY_DELAYS_MS.length) throw error;
      await wait(TRANSIENT_RETRY_DELAYS_MS[attempt]!);
    }
  }
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown, options: Pick<RequestOptions, "retryTransient"> = {}) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body), ...options }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
};
