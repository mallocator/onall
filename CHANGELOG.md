# Changelog

## 3.0.0

### Breaking changes

- Requires Node.js >= 16.
- Methods that accept options now take a single trailing options object.
  The legacy positional `useFirst` boolean (third arg of `all`, `allOnce`,
  `allMany`) and the legacy `(cacheLimit, lifo)` positional pair on
  `allCached` have been removed. Migrate `on.all(events, cb, true)` to
  `on.all(events, cb, { useFirst: true })` and
  `on.allCached(events, cb, 4, true)` to
  `on.allCached(events, cb, { cacheLimit: 4, lifo: true })`.
- Listener-attaching methods now return `this` (matching the parent
  `EventEmitter`) and are chainable. The previous `Dispose` return value
  has been removed; cancel a registration by passing `{ signal }` and
  calling `controller.abort()`. 
- Duplicate event names in the `events` array are rejected with
  `TypeError`. The `events` array is snapshotted on entry, so callers
  can mutate it freely after the call returns.
- `any()` requires a callback (was already the case in 2.x but is now
  enforced consistently with the rest of the API).
- Added `on.scope()`, which returns a scoped wrapper whose registration
  methods share an internal `AbortController`. Calling `scope.cancel()`
  removes every registration made through the scope; per-call `signal`s
  are composed with the scope's signal via `AbortSignal.any`.
- Input validation is enforced: empty event arrays, non-positive counts 
  and missing callbacks throw `TypeError`.

### Bug fixes

- `allMany`: listeners are now removed atomically when the configured count
  is reached, preventing the callback from firing one extra time when
  follow-up emits arrive in the same tick.
- `allCached`: the cache eviction logic was rewritten. Previously LIFO mode
  could discard the wrong partial entry, and the parallel `status`/`args`
  arrays could drift out of sync. Eviction now operates on a single queue
  of partial rounds.
- `anyOnce`: sibling listeners are now removed as soon as the first event
  fires, rather than lingering until they themselves fire.

### Tooling

- Migrated from Mocha + Chai + Istanbul to Vitest with built-in V8
  coverage. `npm run coverage` produces `coverage/lcov.info`, which is
  service-independent and can be consumed by any reporting tool.
- Removed Babel, ESLint v7, `gently`, `coveralls` and other unmaintained
  dev dependencies.
- Added `index.d.ts` TypeScript declarations and `exports`/`files`/`types`
  fields in `package.json`.
- Added GitHub Actions workflow running on Node 18, 20 and 22.

## 2.0.0

- Switched from CommonJS wrapper to ES module that extends `EventEmitter`
  directly.

## 1.x

- Initial CommonJS release.
