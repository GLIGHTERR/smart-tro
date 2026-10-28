import { requireApiBaseUrl } from "@/config/env";

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

export type HttpClient = {
  request<T>(path: string, init?: RequestInit): Promise<T>;
};

export function createHttpClient(getToken: () => Promise<string | null>): HttpClient {
  return {
    async request<T>(path: string, init: RequestInit = {}) {
      const token = await getToken();
      const response = await fetch(`${requireApiBaseUrl()}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers
        }
      });
      if (!response.ok) throw new ApiError((await response.text()) || "Request failed.", response.status);
      return (await response.json()) as T;
    }
  };
}
