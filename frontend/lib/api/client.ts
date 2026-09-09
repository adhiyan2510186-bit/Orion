/**
 * Typed API surface. The only module hooks talk to, and the only one that knows about
 * request shapes. Components never see this; they see hooks.
 */

import type {
  DepthProfile,
  MetaResponse,
  QueryRequest,
  QueryResponse,
  QuerySpec,
} from '@/types/argo';
import { getTransport } from './transport';

export interface QueryArgs {
  query: string;
  filters?: QuerySpec | null;
  limit?: number;
  includeProfiles?: boolean;
  includeTrajectories?: boolean;
  parser?: string | null;
}

export function fetchMeta(signal?: AbortSignal): Promise<MetaResponse> {
  return getTransport().getMeta(signal);
}

export function runQuery(args: QueryArgs, signal?: AbortSignal): Promise<QueryResponse> {
  const body: QueryRequest = {
    query: args.query,
    filters: args.filters ?? null,
    options: {
      limit: args.limit ?? null,
      include_profiles: args.includeProfiles ?? false,
      include_trajectories: args.includeTrajectories ?? false,
      parser: args.parser ?? null,
    },
  };
  return getTransport().postQuery(body, signal);
}

export function fetchProfile(
  wmoId: string,
  cycle: number,
  signal?: AbortSignal,
): Promise<DepthProfile> {
  return getTransport().getProfile(wmoId, cycle, signal) as Promise<DepthProfile>;
}

export { ApiError } from './transport';
