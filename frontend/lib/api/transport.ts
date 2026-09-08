/**
 * The transport seam.
 *
 * This is the only layer that performs I/O. Swapping HTTP for a mock lets the entire
 * frontend be developed, demoed and tested with the backend switched off
 * (NEXT_PUBLIC_TRANSPORT=mock), and it is where a future team adds a WebSocket for live
 * float updates without touching a single component.
 *
 * No React component may import this directly. Components -> hooks -> client -> transport.
 */

import type { MetaResponse, QueryRequest, QueryResponse } from '@/types/argo';

export interface Transport {
  readonly id: string;
  getMeta(signal?: AbortSignal): Promise<MetaResponse>;
  postQuery(request: QueryRequest, signal?: AbortSignal): Promise<QueryResponse>;
  getProfile(wmoId: string, cycle: number, signal?: AbortSignal): Promise<unknown>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
const PREFIX = '/api/v1';

async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${PREFIX}${path}`, {
      ...init,
      signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (cause) {
    // An aborted request is a normal part of debounced querying, not a failure to
    // surface. Everything else means the backend is unreachable, and saying so
    // plainly is more useful than a generic "failed to fetch".
    if (signal?.aborted) throw cause;
    throw new ApiError(
      `Cannot reach the FloatChat API at ${API_BASE}. Is the backend running?`,
      0,
      cause,
    );
  }

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text().catch(() => undefined);
    }
    throw new ApiError(`${response.status} ${response.statusText}`, response.status, detail);
  }
  return (await response.json()) as T;
}

export class HttpTransport implements Transport {
  readonly id = 'http';

  getMeta(signal?: AbortSignal) {
    return request<MetaResponse>('/meta', { method: 'GET' }, signal);
  }

  postQuery(body: QueryRequest, signal?: AbortSignal) {
    return request<QueryResponse>(
      '/query',
      { method: 'POST', body: JSON.stringify(body) },
      signal,
    );
  }

  getProfile(wmoId: string, cycle: number, signal?: AbortSignal) {
    return request<unknown>(
      `/floats/${encodeURIComponent(wmoId)}/profile?cycle=${cycle}`,
      { method: 'GET' },
      signal,
    );
  }
}

let cached: Transport | null = null;

export function getTransport(): Transport {
  if (cached) return cached;
  cached = new HttpTransport();
  return cached;
}

/** Test hook. Lets a test or a story inject a fake without touching any component. */
export function setTransport(transport: Transport | null): void {
  cached = transport;
}
