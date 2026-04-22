import { EventEmitter } from 'node:events'

import {
  anySignal,
  assertCount,
  assertEvents,
  assertLimit,
  isComplete,
  makeDispose,
  wireAbort,
} from './helpers.js'

/**
 * `EventEmitter` subclass that fires when all (or any) of a set of events
 * have been emitted. See [`index.d.ts`](./index.d.ts) for the full,
 * authoritative API documentation of every method on this class.
 *
 * @example
 * import On from 'onall'
 *
 * const on = new On()
 * on.allOnce(['ready', 'connected'], ({ ready, connected }) => {
 *   console.log('both fired:', ready, connected)
 * })
 * on.emit('ready', 1)
 * on.emit('connected', 'ok')
 *
 * @see ./index.d.ts
 */
export default class On extends EventEmitter {
  all(events, callback, options = {}) {
    assertEvents(events)
    if (typeof callback !== 'function') {
      throw new TypeError('all() requires a callback')
    }
    const watched = [...events]
    const useFirst = !!options.useFirst
    const remaining = new Set(watched)
    let args = {}
    const wrappers = []
    const dispose = makeDispose(this, wrappers)
    for (const event of watched) {
      const wrapper = (...eventArgs) => {
        if (!useFirst || args[event] === undefined) {
          args[event] = eventArgs
        }
        remaining.delete(event)
        if (remaining.size === 0) {
          for (const e of watched) remaining.add(e)
          const out = args
          args = {}
          callback(out)
        }
      }
      wrappers.push({ event, wrapper })
      this.on(event, wrapper)
    }
    wireAbort(options.signal, dispose)
    return this
  }

  allOnce(events, callback, options = {}) {
    return this.allMany(events, 1, callback, options)
  }

  allMany(events, count, callback, options = {}) {
    assertEvents(events)
    assertCount(count)
    if (typeof callback !== 'function') {
      throw new TypeError('allMany() requires a callback')
    }
    const watched = [...events]
    const { useFirst = false, signal } = options
    const remaining = new Set(watched)
    let args = {}
    let emits = 0
    let disposed = false
    const wrappers = []
    const innerDispose = makeDispose(this, wrappers)
    const dispose = () => {
      if (disposed) return
      disposed = true
      innerDispose()
    }
    let cleanup
    for (const event of watched) {
      const wrapper = (...eventArgs) => {
        if (disposed || emits >= count) return
        if (!useFirst || args[event] === undefined) {
          args[event] = eventArgs
        }
        remaining.delete(event)
        if (remaining.size === 0) {
          emits++
          const out = args
          args = {}
          for (const e of watched) remaining.add(e)
          if (emits >= count) cleanup()
          callback(out)
        }
      }
      wrappers.push({ event, wrapper })
      this.on(event, wrapper)
    }
    cleanup = wireAbort(signal, dispose)
    return this
  }

  allCached(events, callback, options = {}) {
    assertEvents(events)
    if (typeof callback !== 'function') {
      throw new TypeError('allCached() requires a callback')
    }
    const watched = [...events]
    const { cacheLimit, lifo: lifoFlag, signal } = options

    const queue = []
    const wrappers = []
    const dispose = makeDispose(this, wrappers)

    for (const event of watched) {
      const wrapper = (...eventArgs) => {
        let placed = false
        for (const partial of queue) {
          if (!Object.prototype.hasOwnProperty.call(partial, event)) {
            partial[event] = eventArgs
            placed = true
            break
          }
        }
        if (!placed) {
          queue.push({ [event]: eventArgs })
          if (cacheLimit && queue.length > cacheLimit) {
            // Evict the oldest (FIFO, default) or newest (LIFO) incomplete
            // partial so the queue size never exceeds the limit.
            if (lifoFlag) {
              for (let i = queue.length - 1; i >= 0; i--) {
                if (!isComplete(queue[i], watched)) {
                  queue.splice(i, 1)
                  break
                }
              }
            } else {
              for (let i = 0; i < queue.length; i++) {
                if (!isComplete(queue[i], watched)) {
                  queue.splice(i, 1)
                  break
                }
              }
            }
          }
        }
        while (queue.length > 0 && isComplete(queue[0], watched)) {
          callback(queue.shift())
        }
      }
      wrappers.push({ event, wrapper })
      this.on(event, wrapper)
    }
    wireAbort(signal, dispose)
    return this
  }

  any(events, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('any() requires a callback')
    }
    return this.anyMany(events, Number.POSITIVE_INFINITY, callback, options)
  }

  anyOnce(events, callback, options = {}) {
    return this.anyMany(events, 1, callback, options)
  }

  anyMany(events, count, callback, options = {}) {
    assertEvents(events)
    assertLimit(count)
    if (typeof callback !== 'function') {
      throw new TypeError('anyMany() requires a callback')
    }
    const watched = [...events]
    const { signal } = options
    const wrappers = []
    let emits = 0
    let disposed = false
    const innerDispose = makeDispose(this, wrappers)
    const dispose = () => {
      if (disposed) return
      disposed = true
      innerDispose()
    }
    let cleanup
    for (const event of watched) {
      const wrapper = (...eventArgs) => {
        if (disposed) return
        emits++
        if (emits >= count) cleanup()
        callback(event, ...eventArgs)
      }
      wrappers.push({ event, wrapper })
      this.on(event, wrapper)
    }
    cleanup = wireAbort(signal, dispose)
    return this
  }

  scope() {
    return new Scope(this)
  }
}

/**
 * Returned by {@link On#scope}. Auto-injects an `AbortSignal` into every
 * registration method on {@link On} reflectively. A method qualifies if
 * it lives on the `On` prototype, is a function other than `constructor`
 * or `scope`, and follows the convention that its trailing parameter is
 * `options = {}` — in which case `fn.length` is exactly the index at
 * which to splice in the signal.
 *
 * @see ./index.d.ts
 */
class Scope {
  #ac = new AbortController()
  #emitter

  /**
   * @param {On} emitter The emitter to bind to.
   */
  constructor(emitter) {
    this.#emitter = emitter
    const proto = Object.getPrototypeOf(emitter)
    const skip = new Set(['constructor', emitter.scope.name])
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (skip.has(name)) continue
      const fn = proto[name]
      if (typeof fn !== 'function') continue
      const optsIdx = fn.length
      this[name] = (...args) => {
        while (args.length < optsIdx) args.push(undefined)
        args[optsIdx] = this.#withSignal(args[optsIdx])
        return emitter[name](...args)
      }
    }
  }

  get signal() {
    return this.#ac.signal
  }

  cancel(reason) {
    this.#ac.abort(reason)
  }

  #withSignal(opts = {}) {
    const own = this.#ac.signal
    return {
      ...opts,
      signal: opts.signal ? anySignal([opts.signal, own]) : own,
    }
  }
}
