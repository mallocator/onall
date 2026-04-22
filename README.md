# onall

[![npm version](https://badge.fury.io/js/onall.svg)](https://www.npmjs.com/package/onall)
[![CI](https://github.com/mallocator/onall/actions/workflows/ci.yml/badge.svg)](https://github.com/mallocator/onall/actions/workflows/ci.yml)

A small `EventEmitter` extension that fires when **all** (or **any**) of a
set of events have been emitted. Classic callback-and-`this` API plus
`AbortSignal`-based cancellation. Zero runtime dependencies.

## Installation

```sh
npm install onall
```

Requires Node.js 16 or newer. On Node 16 the `reason` argument to
`AbortController#abort` (and the matching `signal.reason`) is silently
dropped — propagating an abort reason requires Node 17.2+.

## Usage

```js
import On from 'onall'

const on = new On()

on.allOnce(['ready', 'connected'], ({ ready, connected }) => {
  console.log('both fired:', ready, connected)
})

on.emit('ready', 1)
on.emit('connected', 'ok')
// -> both fired: [1] ['ok']
```

Every callback receives a `Record<string, unknown[]>` keyed by event name
where the value is the array of arguments that were emitted (matching
`EventEmitter` semantics — `emit('x', 1, 2)` → `{ x: [1, 2] }`).

`any*` callbacks instead receive `(eventName, ...args)`.

## API

All methods accept an optional trailing options object:

| Option       | Methods                              | Description                                                     |
| ------------ | ------------------------------------ | --------------------------------------------------------------- |
| `useFirst`   | `all`, `allOnce`, `allMany`          | Keep the first received args per event instead of the last.    |
| `cacheLimit` | `allCached`                          | Maximum number of buffered partial rounds.                      |
| `lifo`       | `allCached`                          | When buffered, evict newest incomplete partial first.           |
| `signal`     | all                                  | `AbortSignal` that disposes the registration's listeners.       |

Like the parent `EventEmitter`, every listener-attaching method takes a
callback and returns `this`, so calls can be chained.

The `events` array may not contain duplicates; passing one throws
`TypeError`. The array is snapshotted on entry, so mutating it after the
call has no effect on which events are watched.

To cancel a registration, pass an [`AbortSignal`][abortsignal] in the
`signal` option. When you call `controller.abort()` on its
`AbortController`, every listener attached by that single call is
removed. One
controller can drive many registrations — pass the same `signal` to each
call and a single `abort()` tears them all down together.

```js
const ac = new AbortController()

on.all(['ready', 'connected'], cb, { signal: ac.signal })
on.any(['error', 'close'],     cb, { signal: ac.signal })

ac.abort() // both registrations removed
```

[abortsignal]: https://developer.mozilla.org/docs/Web/API/AbortSignal

### `on.all(events, callback, options?)`

Fires `callback` whenever every event has fired at least once, then resets
and listens again. Within a single round (the window from "listeners
attached" to "every event has fired at least once"), repeat emissions of
the same event overwrite the previously stored args by default.

```js
on.all(['a', 'b'], args => console.log(args))
on.emit('a', 1); on.emit('a', 3); on.emit('b', 2)
// -> { a: [3], b: [2] }
```

#### `useFirst`

`useFirst` controls which payload wins when the **same** event fires
multiple times **before a round completes**:

- `useFirst: false` (default) — **last write wins.** Each new emission of
  an event overwrites the previously stored args.
- `useFirst: true` — **first write wins.** The first emission is kept;
  subsequent emissions of the same event in that round are ignored.

```js
on.all(['a', 'b'], args => console.log(args), { useFirst: true })
on.emit('a', 1)
on.emit('a', 2)   // ignored
on.emit('a', 3)   // ignored
on.emit('b', 9)   // round complete -> { a: [1], b: [9] }
```

Use the default when you want the latest snapshot of state once everything
has reported in (e.g. coalescing config updates). Use `useFirst: true`
when arrival matters more than payload, or later emissions are stale
retries (e.g. capturing the original timestamp).

`useFirst` only matters for *duplicate* emissions; once every event has
fired the round closes and the accumulator resets. The option does not
apply to `allCached`, which buffers extras into future rounds rather than
discarding them.

### `on.allOnce(events, callback, options?)`

Same as `all`, but fires only once and removes its listeners afterwards.

```js
on.allOnce(['ready', 'loaded'], ({ ready, loaded }) => {
  console.log(ready, loaded)
})
```

### `on.allMany(events, count, callback, options?)`

Like `allOnce`, but completes `count` rounds before stopping.

### `on.allCached(events, callback, options?)`

Like `all`, but extra emissions of the same event are buffered for future
rounds rather than discarded. Use `cacheLimit` to bound memory usage.

```js
on.allCached(['a', 'b'], args => console.log(args), { cacheLimit: 4 })
```

### `on.any(events, callback, options?)`

Fires `callback(event, ...args)` whenever any of the given events fires.

```js
const ac = new AbortController()
on.any(['click', 'tap'], (event, e) => handle(event, e), { signal: ac.signal })
// later: ac.abort()
```

### `on.anyOnce(events, callback, options?)`

Fires once on the first triggered event, then removes all listeners.

```js
on.anyOnce(['success', 'error'], (event, ...args) => {
  console.log('first:', event, args)
})
```

### `on.anyMany(events, count, callback, options?)`

Fires for the first `count` triggers across all events, then stops.

### `on.scope()`

Returns a scope object whose registration methods auto-inject an
`AbortSignal`. Calling `scope.cancel()` (or aborting `scope.signal`)
tears down every registration made through that scope, in addition to
any per-call `signal` the caller supplied.

Use this when a component, request, or task makes several `On`
registrations that should all be removed together — instead of plumbing
the same `AbortController` into every call.

```js
function connect(on) {
  const group = on.scope()

  group.all(['ready', 'connected'], onReady)
  group.any(['error', 'close'], onTeardown)
  group.allOnce(['done'], onDone)

  return () => group.cancel() // one call removes all three
}
```

A per-call `signal` still works — it is composed with the scope's signal
via [`AbortSignal.any`][abortany], so whichever aborts first wins.

[abortany]: https://developer.mozilla.org/docs/Web/API/AbortSignal/any

## Cancellation with AbortSignal

```js
const ac = new AbortController()
on.allOnce(['fetch:done', 'fetch:error'], result => handle(result), {
  signal: ac.signal,
})

setTimeout(() => ac.abort(new Error('timeout')), 1000)
// When the controller aborts, the listeners are removed; the callback
// simply never fires.
```

## Tests & Coverage

```sh
npm test          # run the suite
npm run coverage  # run with V8 coverage; outputs coverage/lcov.info
```

## License

Apache-2.0
