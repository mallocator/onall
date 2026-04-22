/**
 * Internal helpers shared by the `On` class. Not part of the public API.
 *
 * @module
 */

/**
 * Internal cleanup callback. Removes the listeners attached by a single
 * method invocation and detaches any wired `AbortSignal` handler. Must be
 * idempotent — every call site relies on calling it more than once being a
 * no-op.
 *
 * @typedef {() => void} Dispose
 */

/**
 * Validate that `events` is a non-empty array of unique strings or symbols.
 *
 * @param {unknown} events Value to check.
 * @throws {TypeError} If `events` is not an array, is empty, contains a
 *   non-string / non-symbol entry, or contains duplicates.
 */
export function assertEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError('events must be a non-empty array')
  }
  const seen = new Set()
  for (const event of events) {
    if (typeof event !== 'string' && typeof event !== 'symbol') {
      throw new TypeError('events must contain only strings or symbols')
    }
    if (seen.has(event)) {
      throw new TypeError('events must not contain duplicates')
    }
    seen.add(event)
  }
}

/**
 * Validate that `count` is a positive integer.
 *
 * @param {unknown} count Value to check.
 * @throws {TypeError} If `count` is not a positive integer.
 */
export function assertCount(count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new TypeError('count must be a positive integer')
  }
}

/**
 * Validate that `count` is a positive integer or `Number.POSITIVE_INFINITY`.
 * Used by `anyMany`, where `Infinity` means "unbounded" (the form `any()`
 * uses internally).
 *
 * @param {unknown} count Value to check.
 * @throws {TypeError} If `count` is neither `Infinity` nor a positive
 *   integer.
 */
export function assertLimit(count) {
  if (count === Number.POSITIVE_INFINITY) return
  assertCount(count)
}

/**
 * Build the idempotent cleanup function used by every registration
 * method. Removes every listener that was attached for the call and
 * empties the wrapper list so subsequent invocations are no-ops.
 *
 * @param {{ removeListener(event: string|symbol, fn: Function): unknown }} emitter
 *   Target emitter that owns the listeners.
 * @param {Array<{ event: string|symbol, wrapper: Function }>} wrappers
 *   Mutable list of listeners attached by the call.
 * @returns {Dispose}
 */
export function makeDispose(emitter, wrappers) {
  return () => {
    for (const { event, wrapper } of wrappers) {
      emitter.removeListener(event, wrapper)
    }
    wrappers.length = 0
  }
}

/**
 * Wire an `AbortSignal` so that `dispose` runs when the signal aborts (or
 * immediately, if the signal is already aborted). Returns a wrapper that
 * also detaches the abort listener — used by methods that auto-complete
 * (e.g. `allMany` once `count` is reached) so an aborted-after-the-fact
 * signal doesn't keep a reference to a now-dead handler.
 *
 * `dispose` must be idempotent; this helper does not guard duplicate
 * invocations itself.
 *
 * @param {AbortSignal|undefined} signal Signal to observe; if falsy the
 *   original `dispose` is returned unchanged.
 * @param {Dispose} dispose Cleanup function to invoke on abort or on
 *   internal completion.
 * @returns {Dispose} A function that runs `dispose` and detaches the
 *   abort listener.
 */
export function wireAbort(signal, dispose) {
  if (!signal) return dispose
  if (signal.aborted) {
    dispose()
    return dispose
  }
  const onAbort = () => dispose()
  signal.addEventListener('abort', onAbort, { once: true })
  return () => {
    signal.removeEventListener('abort', onAbort)
    dispose()
  }
}

/**
 * Combine multiple `AbortSignal`s into a single signal that aborts as
 * soon as any of the inputs does. Prefers the standard
 * [`AbortSignal.any`][1] when available (Node ≥ 18.17 / 20.3) and
 * falls back to a manual implementation otherwise.
 *
 * [1]: https://developer.mozilla.org/docs/Web/API/AbortSignal/any
 *
 * @param {AbortSignal[]} signals Non-empty list of signals.
 * @returns {AbortSignal} A signal that mirrors the first one to abort.
 */
export function anySignal(signals) {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)
  const ac = new AbortController()
  for (const s of signals) {
    if (s.aborted) {
      ac.abort(s.reason)
      return ac.signal
    }
    s.addEventListener('abort', () => ac.abort(s.reason), { once: true })
  }
  return ac.signal
}

/**
 * Test whether a partial round has received an entry for every event in
 * the watched set.
 *
 * @param {Object<string, unknown[]>} partial Partial result accumulator.
 * @param {ReadonlyArray<string|symbol>} events Events required for completion.
 * @returns {boolean} `true` when every event key is present.
 */
export function isComplete(partial, events) {
  for (const event of events) {
    if (!Object.prototype.hasOwnProperty.call(partial, event)) return false
  }
  return true
}
