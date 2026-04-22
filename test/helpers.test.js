import { describe, expect, it, vi } from 'vitest'

import {
  anySignal,
  assertCount,
  assertEvents,
  assertLimit,
  isComplete,
  makeDispose,
  wireAbort,
} from '../helpers.js'

describe('assertEvents()', () => {
  it('accepts a non-empty array of strings or symbols', () => {
    expect(() => assertEvents(['a', 'b'])).not.toThrow()
    expect(() => assertEvents([Symbol('s')])).not.toThrow()
  })

  it('throws on non-array', () => {
    expect(() => assertEvents('a')).toThrow(TypeError)
    expect(() => assertEvents(undefined)).toThrow(TypeError)
  })

  it('throws on empty array', () => {
    expect(() => assertEvents([])).toThrow(TypeError)
  })

  it('throws on non-string / non-symbol entries', () => {
    expect(() => assertEvents(['a', 42])).toThrow(TypeError)
    expect(() => assertEvents([null])).toThrow(TypeError)
  })

  it('throws on duplicates', () => {
    expect(() => assertEvents(['a', 'a'])).toThrow(TypeError)
    const sym = Symbol('s')
    expect(() => assertEvents([sym, sym])).toThrow(TypeError)
  })
})

describe('assertCount()', () => {
  it('accepts positive integers', () => {
    expect(() => assertCount(1)).not.toThrow()
    expect(() => assertCount(99)).not.toThrow()
  })

  it('rejects zero, negatives, non-integers and non-numbers', () => {
    expect(() => assertCount(0)).toThrow(TypeError)
    expect(() => assertCount(-1)).toThrow(TypeError)
    expect(() => assertCount(1.5)).toThrow(TypeError)
    expect(() => assertCount('1')).toThrow(TypeError)
  })
})

describe('assertLimit()', () => {
  it('accepts positive integers and Infinity', () => {
    expect(() => assertLimit(1)).not.toThrow()
    expect(() => assertLimit(Number.POSITIVE_INFINITY)).not.toThrow()
  })

  it('rejects everything assertCount does, except Infinity', () => {
    expect(() => assertLimit(0)).toThrow(TypeError)
    expect(() => assertLimit(-1)).toThrow(TypeError)
    expect(() => assertLimit(1.5)).toThrow(TypeError)
    expect(() => assertLimit(NaN)).toThrow(TypeError)
    expect(() => assertLimit(Number.NEGATIVE_INFINITY)).toThrow(TypeError)
  })
})

describe('makeDispose()', () => {
  it('removes every wrapper from the emitter', () => {
    const calls = []
    const emitter = {
      removeListener: (event, fn) => calls.push([event, fn]),
    }
    const a = () => {}
    const b = () => {}
    const wrappers = [
      { event: 'x', wrapper: a },
      { event: 'y', wrapper: b },
    ]
    const dispose = makeDispose(emitter, wrappers)
    dispose()
    expect(calls).toEqual([['x', a], ['y', b]])
    expect(wrappers).toEqual([])
  })

  it('is a no-op on a second call', () => {
    const emitter = { removeListener: vi.fn() }
    const wrappers = [{ event: 'x', wrapper: () => {} }]
    const dispose = makeDispose(emitter, wrappers)
    dispose()
    dispose()
    expect(emitter.removeListener).toHaveBeenCalledTimes(1)
  })
})

describe('wireAbort()', () => {
  it('returns the dispose unchanged when no signal is given', () => {
    const dispose = vi.fn()
    expect(wireAbort(undefined, dispose)).toBe(dispose)
    expect(dispose).not.toHaveBeenCalled()
  })

  it('runs dispose immediately when the signal is already aborted', () => {
    const ac = new AbortController()
    ac.abort()
    const dispose = vi.fn()
    wireAbort(ac.signal, dispose)
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('runs dispose when the signal aborts later', () => {
    const ac = new AbortController()
    const dispose = vi.fn()
    wireAbort(ac.signal, dispose)
    expect(dispose).not.toHaveBeenCalled()
    ac.abort()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('returns a wrapper that detaches the abort listener', () => {
    const ac = new AbortController()
    const dispose = vi.fn()
    const wrapped = wireAbort(ac.signal, dispose)
    wrapped()
    expect(dispose).toHaveBeenCalledTimes(1)
    ac.abort() // should NOT trigger dispose again
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

describe('anySignal()', () => {
  it('returns a signal that aborts when any input aborts', () => {
    const a = new AbortController()
    const b = new AbortController()
    const signal = anySignal([a.signal, b.signal])
    expect(signal.aborted).toBe(false)
    b.abort(new Error('boom'))
    expect(signal.aborted).toBe(true)
  })

  it('is already aborted when an input is pre-aborted', () => {
    const a = new AbortController()
    const b = new AbortController()
    a.abort(new Error('first'))
    const signal = anySignal([a.signal, b.signal])
    expect(signal.aborted).toBe(true)
  })

  it('fallback (without AbortSignal.any): aborts when any input aborts', () => {
    const original = AbortSignal.any
    // Force the manual fallback path.
    // @ts-ignore — runtime poke
    AbortSignal.any = undefined
    try {
      const a = new AbortController()
      const b = new AbortController()
      const signal = anySignal([a.signal, b.signal])
      expect(signal.aborted).toBe(false)
      b.abort(new Error('boom'))
      expect(signal.aborted).toBe(true)
    } finally {
      AbortSignal.any = original
    }
  })

  it('fallback (without AbortSignal.any): is already aborted when an input is pre-aborted', () => {
    const original = AbortSignal.any
    // @ts-ignore
    AbortSignal.any = undefined
    try {
      const a = new AbortController()
      a.abort(new Error('first'))
      const signal = anySignal([a.signal, new AbortController().signal])
      expect(signal.aborted).toBe(true)
    } finally {
      AbortSignal.any = original
    }
  })
})

describe('isComplete()', () => {
  it('returns true when every event key is present', () => {
    expect(isComplete({ a: [1], b: [2] }, ['a', 'b'])).toBe(true)
  })

  it('returns false when any key is missing', () => {
    expect(isComplete({ a: [1] }, ['a', 'b'])).toBe(false)
  })

  it('treats explicitly undefined keys as present', () => {
    expect(isComplete({ a: undefined, b: undefined }, ['a', 'b'])).toBe(true)
  })
})
