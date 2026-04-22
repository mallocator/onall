import { EventEmitter } from 'node:events'

/**
 * Map of event name to the array of arguments that were emitted for that
 * event. Mirrors the shape of `EventEmitter.emit(event, ...args)`: an
 * `emit('x', 1, 2)` is recorded as `{ x: [1, 2] }`. Symbol event names
 * are supported because the underlying `EventEmitter` accepts them.
 */
export type AllArgs = Record<string | symbol, unknown[]>

/**
 * Options accepted by {@link On.all}, {@link On.allOnce} and
 * {@link On.allMany}.
 */
export interface AllOptions {
  /**
   * When `true`, the first received args for each event in a round are
   * kept and later args are discarded. When `false` (default), each new
   * emission overwrites the previous one until the round completes.
   */
  useFirst?: boolean
  /**
   * When the signal aborts, all listeners attached by the call are
   * removed. Already-aborted signals dispose immediately.
   */
  signal?: AbortSignal
}

/**
 * Options accepted by {@link On.any}, {@link On.anyOnce} and
 * {@link On.anyMany}.
 */
export interface AnyOptions {
  /** See {@link AllOptions.signal}. */
  signal?: AbortSignal
}

/**
 * Options accepted by {@link On.allCached}.
 */
export interface AllCachedOptions {
  /**
   * Maximum number of buffered partial rounds. Any falsy value (default)
   * disables the limit.
   */
  cacheLimit?: number
  /**
   * When the cache is full, evict the newest incomplete partial (LIFO)
   * instead of the oldest (FIFO).
   */
  lifo?: boolean
  /** See {@link AllOptions.signal}. */
  signal?: AbortSignal
}

/**
 * An `EventEmitter` extension that fires reactions when a combination of
 * events have all (or any) been emitted.
 *
 * Every listener-attaching method takes a callback and returns `this`,
 * matching the parent `EventEmitter` API. Cancellation is performed via
 * the standard `AbortSignal` idiom: pass `{ signal }` and call
 * `controller.abort()` to remove every listener attached by the call.
 *
 * @example
 * ```ts
 * import On from 'onall'
 *
 * const on = new On()
 * on.allOnce(['ready', 'connected'], ({ ready, connected }) => {
 *   console.log('both fired:', ready, connected)
 * })
 * on.emit('ready', 1)
 * on.emit('connected', 'ok')
 * ```
 */
export default class On extends EventEmitter {
  /**
   * Wait for every event to fire at least once, invoke `callback` with
   * the collected arguments, then reset and start listening for the next
   * round. Repeat events received within a single round overwrite
   * previous values unless `useFirst` is set, in which case the first
   * value wins.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once per completed round.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid (empty, non-array, wrong
   *   element type, or duplicates) or `callback` is missing.
   */
  all(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): this

  /**
   * Wait for every event to fire at least once, then invoke `callback`
   * and remove every listener.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once with the collected arguments.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  allOnce(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): this

  /**
   * Like {@link On.allOnce} but completes `count` rounds before stopping.
   * After the final round all listeners are removed automatically.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param count Number of complete rounds before stopping.
   * @param callback Invoked once per completed round.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid, `callback` is missing, or
   *   `count` is not a positive integer.
   */
  allMany(
    events: ReadonlyArray<string | symbol>,
    count: number,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): this

  /**
   * Wait for every event to fire at least once, then reset. Unlike
   * {@link On.all}, repeat events received before completion are queued
   * for future rounds rather than discarded.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once per completed round, in the order
   *   rounds complete.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  allCached(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllCachedOptions,
  ): this

  /**
   * Fire `callback(eventName, ...args)` whenever any of the given events
   * fires. Continues firing until `options.signal` aborts.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked for every emission of any watched event.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  any(
    events: ReadonlyArray<string | symbol>,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): this

  /**
   * Fire `callback` once on the first triggered event, then remove every
   * listener.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once with the event name and arguments.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  anyOnce(
    events: ReadonlyArray<string | symbol>,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): this

  /**
   * Fire `callback` for the first `count` triggers across all events,
   * then remove every listener.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param count Maximum number of triggers before stopping.
   * @param callback Invoked per trigger with the event name and arguments.
   * @param options
   * @returns The emitter, for chaining.
   * @throws {TypeError} If `events` is invalid, `callback` is missing, or
   *   `count` is not a positive integer.
   */
  anyMany(
    events: ReadonlyArray<string | symbol>,
    count: number,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): this

  /**
   * Create a scope that auto-injects an `AbortSignal` into every call
   * made through it. Calling `scope.cancel()` (or aborting
   * `scope.signal`) tears down every registration created via that
   * scope, in addition to any per-call `signal` the caller supplied.
   *
   * @example
   * ```ts
   * const group = on.scope()
   * group.all(['ready', 'connected'], cb)
   * group.any(['error', 'close'], cb)
   * group.cancel() // removes both registrations
   * ```
   */
  scope(): Scope
}

/**
 * Returned by {@link On.scope}. Mirrors every registration method on
 * {@link On}, but auto-injects an `AbortSignal` so {@link Scope.cancel}
 * (or aborting {@link Scope.signal}) removes every listener attached
 * through this scope.
 */
export interface Scope {
  /** Aborts when {@link Scope.cancel} is called. */
  readonly signal: AbortSignal

  /**
   * Abort the scope's signal, removing every listener attached through
   * this scope.
   */
  cancel(reason?: unknown): void

  /**
   * Wait for every event to fire at least once, invoke `callback` with
   * the collected arguments, then reset and start listening for the next
   * round. Repeat events received within a single round overwrite
   * previous values unless `useFirst` is set, in which case the first
   * value wins.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once per completed round.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid (empty, non-array, wrong
   *   element type, or duplicates) or `callback` is missing.
   */
  all(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): On

  /**
   * Wait for every event to fire at least once, then invoke `callback`
   * and remove every listener.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once with the collected arguments.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  allOnce(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): On

  /**
   * Like {@link Scope.allOnce} but completes `count` rounds before
   * stopping. After the final round all listeners are removed
   * automatically.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param count Number of complete rounds before stopping.
   * @param callback Invoked once per completed round.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid, `callback` is missing, or
   *   `count` is not a positive integer.
   */
  allMany(
    events: ReadonlyArray<string | symbol>,
    count: number,
    callback: (args: AllArgs) => void,
    options?: AllOptions,
  ): On

  /**
   * Wait for every event to fire at least once, then reset. Unlike
   * {@link Scope.all}, repeat events received before completion are
   * queued for future rounds rather than discarded.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once per completed round, in the order
   *   rounds complete.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  allCached(
    events: ReadonlyArray<string | symbol>,
    callback: (args: AllArgs) => void,
    options?: AllCachedOptions,
  ): On

  /**
   * Fire `callback(eventName, ...args)` whenever any of the given events
   * fires. Continues firing until {@link Scope.cancel} is called or
   * `options.signal` aborts.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked for every emission of any watched event.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  any(
    events: ReadonlyArray<string | symbol>,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): On

  /**
   * Fire `callback` once on the first triggered event, then remove every
   * listener.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param callback Invoked once with the event name and arguments.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid or `callback` is missing.
   */
  anyOnce(
    events: ReadonlyArray<string | symbol>,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): On

  /**
   * Fire `callback` for the first `count` triggers across all events,
   * then remove every listener.
   *
   * The scope's `AbortSignal` is auto-injected, so {@link Scope.cancel}
   * removes every listener attached by this call.
   *
   * @param events Events to watch. Must be a non-empty array of unique
   *   strings or symbols.
   * @param count Maximum number of triggers before stopping.
   * @param callback Invoked per trigger with the event name and arguments.
   * @param options
   * @returns The underlying emitter, for chaining.
   * @throws {TypeError} If `events` is invalid, `callback` is missing, or
   *   `count` is not a positive integer.
   */
  anyMany(
    events: ReadonlyArray<string | symbol>,
    count: number,
    callback: (event: string | symbol, ...args: unknown[]) => void,
    options?: AnyOptions,
  ): On
}
