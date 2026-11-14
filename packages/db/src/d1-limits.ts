/**
 * D1's hard per-statement limits. `bun:sqlite`, which the tests run on, shares
 * none of them, so `freshDb()` (`./testing`) enforces these to make a query
 * that D1 would reject fail in CI too. Production code sizes its chunks from
 * the same numbers (`chunkBinds` in `@app/api`).
 */
export const D1_LIMITS = {
  /** Bound parameters per statement: `D1_ERROR: too many SQL variables`. */
  boundParams: 100,
  /** Bytes per string or BLOB value. */
  valueBytes: 2_000_000,
  /** Bytes of SQL text per statement. */
  statementBytes: 100_000,
} as const
