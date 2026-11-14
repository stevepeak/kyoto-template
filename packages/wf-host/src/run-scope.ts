/**
 * Map a collected context bag onto the opaque RunContext identity fields
 * `buildRunDeps` reads. One mapping for every caller: the playgrounds and eval
 * samples collect the same `toolContextFields`, so they must resolve them the
 * same way. A blank value stays undefined — an unscoped run, not an
 * empty-string scope.
 *
 * TODO: decide what scopes a run in this app (an org? a user? a document?)
 * and rename these keys to match.
 */
export function runScopeFromContext(context: Record<string, string>): {
  correlationId?: string
  subjectId?: string
} {
  return {
    correlationId: context.scopeId || undefined,
    subjectId: context.subjectId || undefined,
  }
}
