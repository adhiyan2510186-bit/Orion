/**
 * Public surface of the anomalies feature.
 *
 * CLAUDE.md rule 6: a file in one feature may import from another feature only through
 * that feature's index.ts, never by reaching into its components/ or hooks/. The
 * inspector was doing exactly that, which nothing in the build catches — there is no
 * ESLint config in frontend/ yet.
 *
 * Anything not exported here is internal and free to move.
 */
export { AnomalyBadge } from './components/AnomalyBadge';
export { useAnomalies } from './hooks/useAnomalies';
