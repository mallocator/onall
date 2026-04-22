import { describe, it, expect, vi } from 'vitest'
import On from '../index.js'

describe('On.all()', () => {
  it('fires once all events have fired and resets, keeping last args by default', () => {
    const on = new On()
    const cb = vi.fn()
    on.all(['a', 'b'], cb)
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('a', 3)
    on.emit('a', 4)
    on.emit('b', 5)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [4], b: [5] })
  })

  it('keeps the first args when useFirst is true', () => {
    const on = new On()
    const cb = vi.fn()
    on.all(['a', 'b'], cb, { useFirst: true })
    on.emit('a', 1)
    on.emit('a', 2)
    on.emit('b', 3)
    expect(cb).toHaveBeenCalledWith({ a: [1], b: [3] })
  })

  it('returns the emitter for chaining', () => {
    const on = new On()
    const cb = vi.fn()
    expect(on.all(['a', 'b'], cb)).toBe(on)
  })

  it('removes listeners when the AbortSignal aborts', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.all(['a', 'b'], cb, { signal: ac.signal })
    expect(on.listenerCount('a')).toBe(1)
    ac.abort()
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
    on.emit('a', 1)
    on.emit('b', 2)
    expect(cb).not.toHaveBeenCalled()
  })

  it('disposes on AbortSignal abort', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.all(['a', 'b'], cb, { signal: ac.signal })
    ac.abort()
    expect(on.listenerCount('a')).toBe(0)
  })
})

describe('On.allOnce()', () => {
  it('fires once with last args and removes all listeners', () => {
    const on = new On()
    const cb = vi.fn()
    on.allOnce(['a', 'b'], cb)
    on.emit('a', 1)
    on.emit('a', 3)
    on.emit('b', 2)
    on.emit('b', 4)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith({ a: [3], b: [2] })
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('honours useFirst', () => {
    const on = new On()
    const cb = vi.fn()
    on.allOnce(['a', 'b'], cb, { useFirst: true })
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('a', 3)
    on.emit('b', 4)
    expect(cb).toHaveBeenCalledWith({ a: [1], b: [2] })
  })

  it('removes every listener after the last round (leak regression)', () => {
    const on = new On()
    on.allOnce(['a', 'b'], () => {})
    on.emit('a', 1)
    on.emit('b', 2)
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('removes listeners when the AbortSignal aborts (without callback firing)', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.allOnce(['a', 'b'], cb, { signal: ac.signal })
    ac.abort()
    expect(on.listenerCount('a')).toBe(0)
    on.emit('a', 1); on.emit('b', 2)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('On.allMany()', () => {
  it('fires `count` times with last args, then removes listeners', () => {
    const on = new On()
    const cb = vi.fn()
    on.allMany(['a', 'b'], 2, cb)
    on.emit('a', 0)
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('a', 3)
    on.emit('b', 4)
    on.emit('b', 5)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [3], b: [4] })
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('honours useFirst across rounds', () => {
    const on = new On()
    const cb = vi.fn()
    on.allMany(['a', 'b'], 2, cb, { useFirst: true })
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('a', 3)
    on.emit('b', 4)
    on.emit('a', 5)
    on.emit('b', 6)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [3], b: [4] })
  })

  it('does not over-fire when the count is reached mid-emit (regression)', () => {
    const on = new On()
    const cb = vi.fn()
    on.allMany(['a'], 1, cb)
    on.emit('a', 1)
    on.emit('a', 2)
    on.emit('a', 3)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('throws on invalid count', () => {
    const on = new On()
    expect(() => on.allMany(['a'], 0, () => {})).toThrow(TypeError)
    expect(() => on.allMany(['a'], -1, () => {})).toThrow(TypeError)
    expect(() => on.allMany(['a'], 1.5, () => {})).toThrow(TypeError)
  })

  it('handles re-entrant emit from within the callback', () => {
    const on = new On()
    const seen = []
    on.allMany(['a', 'b'], 2, ({ a, b }) => {
      seen.push([a[0], b[0]])
      // Re-emit during callback. The emit() walks a snapshot of listeners,
      // so this should be queued for the next round, not processed in
      // the same dispatch.
      if (seen.length === 1) {
        on.emit('a', 10)
        on.emit('b', 20)
      }
    })
    on.emit('a', 1)
    on.emit('b', 2)
    expect(seen).toEqual([[1, 2], [10, 20]])
    expect(on.listenerCount('a')).toBe(0)
  })
})

describe('On.allCached()', () => {
  it('queues duplicate events for future rounds', () => {
    const on = new On()
    const cb = vi.fn()
    on.allCached(['a', 'b'], cb)
    on.emit('a', 1)
    on.emit('a', 3)
    on.emit('b', 2)
    on.emit('b', 4)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [3], b: [4] })
  })

  it('discards oldest entries first when cacheLimit is reached (FIFO)', () => {
    const on = new On()
    const cb = vi.fn()
    on.allCached(['a', 'b'], cb, { cacheLimit: 2 })
    on.emit('a', 0) // evicted
    on.emit('a', 1)
    on.emit('a', 3)
    on.emit('b', 2)
    on.emit('b', 4)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [3], b: [4] })
  })

  it('discards newest entries first when lifo is true', () => {
    const on = new On()
    const cb = vi.fn()
    on.allCached(['a', 'b'], cb, { cacheLimit: 2, lifo: true })
    on.emit('a', 1)
    on.emit('a', 3)
    on.emit('a', 5) // evicted (newest incomplete)
    on.emit('b', 2)
    on.emit('b', 4)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb.mock.calls[0][0]).toEqual({ a: [1], b: [2] })
    expect(cb.mock.calls[1][0]).toEqual({ a: [3], b: [4] })
  })

  it('removes listeners when the AbortSignal aborts', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.allCached(['a', 'b'], cb, { signal: ac.signal })
    expect(on.listenerCount('a')).toBe(1)
    ac.abort()
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
    on.emit('a', 1); on.emit('b', 2)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('On.any()', () => {
  it('fires for every triggered event', () => {
    const on = new On()
    const cb = vi.fn()
    on.any(['a', 'b'], cb)
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('a', 3)
    expect(cb).toHaveBeenCalledTimes(3)
    expect(cb).toHaveBeenNthCalledWith(1, 'a', 1)
    expect(cb).toHaveBeenNthCalledWith(2, 'b', 2)
    expect(cb).toHaveBeenNthCalledWith(3, 'a', 3)
  })

  it('returns the emitter for chaining', () => {
    const on = new On()
    const cb = vi.fn()
    expect(on.any(['a', 'b'], cb)).toBe(on)
  })

  it('removes listeners when the AbortSignal aborts', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.any(['a', 'b'], cb, { signal: ac.signal })
    ac.abort()
    on.emit('a', 1)
    expect(cb).not.toHaveBeenCalled()
    expect(on.listenerCount('a')).toBe(0)
  })
})

describe('On.anyMany()', () => {
  it('fires for the first `count` triggers, then stops', () => {
    const on = new On()
    const cb = vi.fn()
    on.anyMany(['a', 'b'], 2, cb)
    on.emit('a', 1)
    on.emit('b', 2)
    on.emit('b', 3)
    expect(cb).toHaveBeenCalledTimes(2)
    expect(cb).toHaveBeenNthCalledWith(1, 'a', 1)
    expect(cb).toHaveBeenNthCalledWith(2, 'b', 2)
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('resolves listener cleanup after final round (leak regression)', () => {
    const on = new On()
    on.anyMany(['a', 'b'], 1, () => {})
    on.emit('a', 1)
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('accepts Infinity as an unbounded count', () => {
    const on = new On()
    const cb = vi.fn()
    expect(() =>
      on.anyMany(['a'], Number.POSITIVE_INFINITY, cb),
    ).not.toThrow()
    on.emit('a', 1); on.emit('a', 2); on.emit('a', 3)
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('rejects non-integer / non-Infinity counts', () => {
    const on = new On()
    expect(() => on.anyMany(['a'], 0, () => {})).toThrow(TypeError)
    expect(() => on.anyMany(['a'], -1, () => {})).toThrow(TypeError)
    expect(() => on.anyMany(['a'], 1.5, () => {})).toThrow(TypeError)
    expect(() => on.anyMany(['a'], Number.NEGATIVE_INFINITY, () => {})).toThrow(
      TypeError,
    )
    expect(() => on.anyMany(['a'], NaN, () => {})).toThrow(TypeError)
  })

  it('handles re-entrant emit from within the callback', () => {
    const on = new On()
    const seen = []
    on.anyMany(['a', 'b'], 3, (event, value) => {
      seen.push([event, value])
      if (seen.length === 1) on.emit('b', 99)
    })
    on.emit('a', 1)
    expect(seen).toEqual([['a', 1], ['b', 99]])
    on.emit('b', 2)
    expect(seen).toEqual([['a', 1], ['b', 99], ['b', 2]])
    expect(on.listenerCount('a')).toBe(0)
  })
})

describe('On.anyOnce()', () => {
  it('fires once and removes every sibling listener (regression)', () => {
    const on = new On()
    const cb = vi.fn()
    on.anyOnce(['a', 'b'], cb)
    on.emit('a', 1)
    on.emit('b', 2)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('a', 1)
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
  })

  it('removes listeners when the AbortSignal aborts (without callback firing)', () => {
    const on = new On()
    const ac = new AbortController()
    const cb = vi.fn()
    on.anyOnce(['a', 'b'], cb, { signal: ac.signal })
    ac.abort()
    expect(on.listenerCount('a')).toBe(0)
    on.emit('a', 1)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('input validation', () => {
  it('rejects non-array events', () => {
    const on = new On()
    expect(() => on.all('not-an-array', () => {})).toThrow(TypeError)
  })

  it('rejects empty events array', () => {
    const on = new On()
    expect(() => on.all([], () => {})).toThrow(TypeError)
  })

  it('rejects non-string event names', () => {
    const on = new On()
    expect(() => on.all([123], () => {})).toThrow(TypeError)
  })

  it('rejects duplicate events', () => {
    const on = new On()
    expect(() => on.all(['a', 'a'], () => {})).toThrow(TypeError)
  })

  it('all() requires a callback', () => {
    const on = new On()
    expect(() => on.all(['a'])).toThrow(TypeError)
  })

  it('any() requires a callback', () => {
    const on = new On()
    expect(() => on.any(['a'])).toThrow(TypeError)
  })

  it('allCached() requires a callback', () => {
    const on = new On()
    expect(() => on.allCached(['a'])).toThrow(TypeError)
  })
})

describe('On.scope()', () => {
  it('cancel() removes every registration made via the scope', () => {
    const on = new On()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const group = on.scope()
    group.all(['a', 'b'], cb1)
    group.any(['c'], cb2)
    expect(on.listenerCount('a')).toBe(1)
    expect(on.listenerCount('c')).toBe(1)
    group.cancel()
    expect(on.listenerCount('a')).toBe(0)
    expect(on.listenerCount('b')).toBe(0)
    expect(on.listenerCount('c')).toBe(0)
    on.emit('a', 1); on.emit('b', 2); on.emit('c', 3)
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).not.toHaveBeenCalled()
  })

  it('does not affect registrations made directly on the emitter', () => {
    const on = new On()
    const direct = vi.fn()
    on.any(['a'], direct)
    const group = on.scope()
    group.any(['a'], vi.fn())
    expect(on.listenerCount('a')).toBe(2)
    group.cancel()
    expect(on.listenerCount('a')).toBe(1)
    on.emit('a', 1)
    expect(direct).toHaveBeenCalledWith('a', 1)
  })

  it('combines a per-call signal with the scope signal', () => {
    const on = new On()
    const cb = vi.fn()
    const group = on.scope()
    const ac = new AbortController()
    group.all(['a', 'b'], cb, { signal: ac.signal })
    expect(on.listenerCount('a')).toBe(1)
    ac.abort() // per-call signal aborts -> registration gone
    expect(on.listenerCount('a')).toBe(0)
    // scope itself still functional
    group.any(['c'], cb)
    expect(on.listenerCount('c')).toBe(1)
    group.cancel()
    expect(on.listenerCount('c')).toBe(0)
  })

  it('rejects scoped registrations made after cancel via subsequent emits', () => {
    const on = new On()
    const cb = vi.fn()
    const group = on.scope()
    group.cancel()
    // signal already aborted -> wireAbort disposes immediately
    group.all(['a', 'b'], cb)
    expect(on.listenerCount('a')).toBe(0)
    on.emit('a', 1); on.emit('b', 2)
    expect(cb).not.toHaveBeenCalled()
  })

  it('forwards options to the underlying methods', () => {
    const on = new On()
    const cb = vi.fn()
    const group = on.scope()
    group.all(['a', 'b'], cb, { useFirst: true })
    on.emit('a', 1); on.emit('a', 2); on.emit('b', 3)
    expect(cb).toHaveBeenCalledWith({ a: [1], b: [3] })
  })
})
