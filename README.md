# onall
[![npm version](https://badge.fury.io/js/onall.svg)](http://badge.fury.io/js/onall)
[![Build Status](https://travis-ci.org/mallocator/onall.svg?branch=master)](https://travis-ci.org/mallocator/onall)
[![Coverage Status](https://coveralls.io/repos/github/mallocator/onall/badge.svg?branch=master)](https://coveralls.io/github/mallocator/onall?branch=master)
[![Dependency Status](https://david-dm.org/mallocator/onall.svg)](https://david-dm.org/mallocator/onall) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmallocator%2Fonall.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmallocator%2Fonall?ref=badge_shield)


This is a super simple set of helper functions that allow you to react on more complex events from an event emitter.
Events can be bundled and processed when either all of them or any of them fire. There are different modes for how you
want to handle repeat events. 

This library is written in ECMA6 for node.js and currently not compatible with previous versions or browsers.

## Installation

```npm install --save onall```


## API

Here are some simple examples on how to use the API. For more details take a look at the test cases.


### On.all()

```On.all({string[]} events, {function} callback, {boolean, optional} useFirst)```

React as soon as all registered events have been fired at least once (and then reset). If an event is fired before all other events are fired, the 
arguments are overwritten, unless ```useFirst``` is set to true in which case the first argument is used and subsequent arguments are discarded.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.all(['event1', 'event2'], args => {
    console.log(args);
});
emitter.emit('event1', 'arg1');
emitter.emit('event1', 'arg3');
emitter.emit('event2', 'arg2');
 // => { event1: ['arg3'], event2: ['arg2'] }
```                


### On.allCached()

```On.allCached({string[]} events, {function} callback, {number, optional} cacheLimit, {boolean, optional} lifo)```

React as soon as all registered events have been fired at least once (and then reset). Other than the standard ```On.all()``` method this one will
queue up events and not discard duplicate events. An optional limit to the size of the cache can be passed set which will discard the oldest partial 
entries. The limited cache can discard oldest entries first (default: lifo = false) or newest first (lifo = true).

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.allCached(['event1', 'event2'], args => {
    console.log(args);
});
emitter.emit('event1', 'arg1');
emitter.emit('event1', 'arg3');
emitter.emit('event2', 'arg2');
// => { event1: ['arg1'], event2: ['arg2'] }
emitter.emit('event2', 'arg4');
 // => { event1: ['arg3'], event2: ['arg4'] }
```             


### On.allOnce()

```On.allOnce({string[]} events, {function} callback, {boolean, optional} useFirst)```

Will react as soon as all events have been fired at least once and then no longer listen to events. Only the first event is recorded so that
subsequent events will be ignored.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.allOnce(['event1', 'event2'], args => {
    console.log(args);
});
emitter.emit('event1', 'arg1');
emitter.emit('event2', 'arg2');
// => { event1: ['arg1'], event2: ['arg2'] }
emitter.emit('event1', 'arg3');
emitter.emit('event2', 'arg4');
// => ignored
```


### On.allMany()

```On.allOnce({string[]} events, {number} count, {function} callback, {boolean, optional} useFirst)```

Will react as soon as all events have been fired at least once and then no longer listen to events. Only the configured number of events is recorded so that
subsequent events will be ignored.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.allMany(['event1', 'event2'], 2, args => {
    console.log(args);
});
emitter.emit('event1', 'arg1');
emitter.emit('event2', 'arg2');
// => { event1: ['arg1'], event2: ['arg2'] }
emitter.emit('event1', 'arg3');
emitter.emit('event2', 'arg4');
// => { event1: ['arg3'], event2: ['arg4'] }
emitter.emit('event1', 'arg5');
emitter.emit('event2', 'arg6');
// => ignored
```


### On.any()

```On.any({string[]} events, {function} callback)```

Will react as soon as any of the given events are triggered.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.any(['event1', 'event2'], (event, arg) => {
    console.log(event, arg);
});
emitter.emit('event1', 'arg1');
=> 'event1', 'arg1'
emitter.emit('event2', 'arg2');
=> 'event2', 'arg2'
```


### On.anyOnce()

```On.anyOnce({string[]} events, {function} callback)```

Will react as soon as any of the given events are triggered, and then stops listening.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.anyOnce(['event1', 'event2'], (event, arg) => {
    console.log(event, arg);
});
emitter.emit('event1', 'arg1');
=> 'event1', 'arg1'
emitter.emit('event2', 'arg2');
=> ignored
```


### On.anyMany()

Will react as soon as a given number of events are triggered, and then stops listening.

```
var On = require('onall');
var emitter = new events.EventEmitter();
var on = new On(emitter);
on.anyMany(['event1', 'event2'], 2, (event, arg) => {
    console.log(event, arg);
});
emitter.emit('event1', 'arg1');
=> 'event1', 'arg1'
emitter.emit('event2', 'arg2');
=> 'event2', 'arg2'
emitter.emit('event1', 'arg3');
=> ignored
```


## Tests

To run the tests simply run ```npm test```


## Bugs / Feature Requests / Questions

If you have any of those you can file a ticket on [Github](https://github.com/mallocator/onall/issues) or send me an email to mallox@pyxzl.net


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fmallocator%2Fonall.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fmallocator%2Fonall?ref=badge_large)