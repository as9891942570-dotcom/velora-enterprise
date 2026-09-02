import { API_BASE_URL } from "@/lib/config";
import { waitForAuthReady } from "@/lib/auth-gate";
import type { AuthScope } from "@/lib/auth-session";
import type { ApiError } from "@/lib/types";

const API_URL = API_BASE_URL;

const accessTokens: Record<AuthScope, string | null> = {
  customer: null,
  admin: null,
};

const refreshPromises: Record<AuthScope, Promise<string | null> | null> = {
  customer: null,
  admin: null,
};

type CartListener = () => void;
const cartListeners = new Set<CartListener>();

export function subscribeCart(listener: CartListener): () => void {
  cartListeners.add(listener);
  return () => cartListeners.delete(listener);
}

export function notifyCartChanged(): void {
  cartListeners.forEach((listener) => listener());
}

export function setAccessToken(token: string | null, scope: AuthScope = "customer"): void {
  accessTokens[scope] = token;
}

export function getAccessToken(scope: AuthScope = "customer"): string | null {
  return accessTokens[scope];
}

export class ApiRequestError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function parseErrorDetail(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const err = data as ApiError;
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((e) => e.msg).join(", ");
  }
  return "Request failed";
}

function resolveAuthScope(path: string, explicit?: AuthScope): AuthScope {
  if (explicit) return explicit;
  const normalized = path.startsWith("http") ? new URL(path).pathname : path;
  if (normalized.includes("/admin/") || normalized.startsWith("/admin")) {
    return "admin";
  }
  return "customer";
}

function refreshPath(scope: AuthScope): string {
  return scope === "admin" ? "/auth/admin/refresh" : "/auth/refresh";
}

export async function refreshAccessToken(scope: AuthScope): Promise<string | null> {
  if (refreshPromises[scope]) return refreshPromises[scope];

  refreshPromises[scope] = (async () => {
    try {
      const res = await fetch(`${API_URL}${refreshPath(scope)}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        accessTokens[scope] = null;
        return null;
      }
      const data = (await res.json()) as { access_token: string };
      accessTokens[scope] = data.access_token;
      return accessTokens[scope];
    } catch {
      accessTokens[scope] = null;
      return null;
    } finally {
      refreshPromises[scope] = null;
    }
  })();

  return refreshPromises[scope];
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  /** Which session token to use when auth=true. Auto-detected from /admin paths. */
  authScope?: AuthScope;
  skipRefresh?: boolean;
}

async function ensureAccessToken(scope: AuthScope, skipRefresh: boolean): Promise<string | null> {
  if (accessTokens[scope]) {
    return accessTokens[scope];
  }
  if (skipRefresh) {
    return null;
  }
  await refreshAccessToken(scope);
  return accessTokens[scope];
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, auth = false, authScope, skipRefresh = false, headers: customHeaders, ...rest } = options;
  const scope = auth ? resolveAuthScope(path, authScope) : "customer";

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    await waitForAuthReady(scope);
    const token = await ensureAccessToken(scope, skipRefresh);
    if (!token) {
      throw new ApiRequestError(401, "Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  let res = await fetch(url, {
    ...rest,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !skipRefresh) {
    const newToken = await refreshAccessToken(scope);
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...rest,
        credentials: "include",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = parseErrorDetail(data);
    } catch {
      // ignore
    }
    throw new ApiRequestError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function serverFetch<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T> {
  const { revalidate = 60, ...rest } = init ?? {};
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    ...rest,
    next: { revalidate },
  });
  if (!res.ok) {
    throw new ApiRequestError(res.status, `Failed to fetch ${path}`);
  }
  return res.json() as Promise<T>;
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
