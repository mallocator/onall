'use strict'

import EventEmitter from 'events'

function isEmpty(obj) {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false
    }
  }
  return true
}

/**
 * An event emitter helper class that allows to register multiple events at once.
 */
export default class On extends EventEmitter {
  constructor(...args) {
    super(...args)
  }

  /**
   * Waits for all passed in events to be fired once. Arguments are passed on as object parameter with keys for each event.
   * Multiple calls to the same event are ignored.
   * @param {string[]} events
   * @param {function} callback
   * @param {boolean} [useFirst=false]
   */
  allOnce(events, callback, useFirst) {
    let status = {}
    let args = {}
    if (useFirst) {
      for (const event of events) {
        status[event] = true
        this.once(event,  (...eventArgs) => {
          delete status[event]
          args[event] = eventArgs
          if (isEmpty(status)) {
            callback(args)
          }
        })
      }
    } else {
      let listeners = []
      let that = this
      for (const event of events) {
        status[event] = true
        let listener = (...eventArgs) =>  {
          delete status[event]
          args[event] = eventArgs
          if (isEmpty(status)) {
            for (let listener of listeners) {
              that.removeListener(event, listener)
            }
            callback(args)
          }
        }
        listeners.push(listener)
        this.on(event, listener)
      }
    }
  }

  /**
   * Waits for all passed in events to be fired as often as defined. Arguments are passed on as object parameter with
   * keys for each event. Multiple calls to the same event are ignored.
   * @param {string[]} events
   * @param {number} count
   * @param {function} callback
   * @param {boolean} [useFirst=false]
   */
  allMany(events, count, callback, useFirst) {
    let status = {}
    let args = {}
    let callbacks = []
    let emits = 0
    for (const event of events) {
      status[event] = true
      let wrapper =  (...eventArgs) => {
        delete status[event]
        args[event] = useFirst && args[event] !== undefined ? args[event] : eventArgs
        if (isEmpty(status)) {
          emits++
          if (emits === count) {
            for (let callback of callbacks) {
              this.removeListener(callback.event, callback.wrapper)
            }
          }
          status = {}
          for (const event2 of events) {
            status[event2] = true
          }
          callback(args)
          args = {}
        }
      }
      callbacks.push({ event, wrapper })
      this.on(event, wrapper)
    }
  }

  /**
   * Waits for all passed in events to be fired once. If an event is fired twice it's cached for the next round of callbacks.
   * @param {string[]} events
   * @param {function} callback
   * @param {number} [cacheLimit=0] Sets a limited size for the cache. Once reached older messages will be discarded. Any false
   *                                value will disable this check
   * @param {boolean} [lifo=false]  Sets whether we should discard old or new events first when the cacheLimit has been reached.
   *                                ('lifo' = last in first out, default is 'fifo' = first in first out)
   */
  allCached(events, callback, cacheLimit, lifo) {
    let status = [{}]
    let args = [{}]
    for (const event of events) {
      status[0][event] = true
      this.on(event,  (...eventArgs) => {
        let newRequired = true
        for (const i in args) {
          const arg = args[i]
          if (!arg[event]) {
            arg[event] = eventArgs
            newRequired = false
            delete status[i][event]
            break
          }
        }
        if (newRequired) {
          args.push({
            [event]: eventArgs
          })
          if (cacheLimit && cacheLimit < args.length) {
            lifo ? status.pop() : status.shift()
            lifo ? args.pop() : args.shift()
          }
          let queuedStatus = {}
          for (const event2 of events) {
            queuedStatus[event2] = true
          }
          delete queuedStatus[event]
          status.push(queuedStatus)
        }
        if (isEmpty(status[0])) {
          status.shift()
          callback(args[0])
          args.shift()
        }
      })
    }
  }

  /**
   * Waits for all passed in events to be fired once. If an event is fired twice once of the events is discarded.
   * @param {string[]} events
   * @param {function} callback
   * @param {boolean} [useFirst=false]
   */
  all(events, callback, useFirst) {
    let status = {}
    let args = {}
    for (const event of events) {
      status[event] = true
      this.on(event,  (...eventArgs) => {
        delete status[event]
        args[event] = useFirst && args[event] !== undefined ? args[event] : eventArgs
        if (isEmpty(status)) {
          status = {}
          for (const event2 of events) {
            status[event2] = true
          }
          callback(args)
          args = {}
        }
      })
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called once and then removed as a listener.
   * @param {string[]} events
   * @param {function} callback
   */
  anyOnce(events, callback) {
    let done = false
    for (const event of events) {
      this.once(event, (...args) => {
        if (done) {
          return
        }
        done = true
        callback(event, ...args)
      })
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called up to a given number of events.
   * @param {string[]} events
   * @param {number} count
   * @param {function} callback
   */
  anyMany(events, count, callback) {
    const callbacks = []
    let emits = 0
    for (const event of events) {
      let wrapper = (...args) => {
        emits++
        if (emits === count) {
          for (const callback of callbacks) {
            this.removeListener(callback.event, callback.wrapper)
          }
        }
        callback(event, ...args)
      }
      callbacks.push({event, wrapper})
      this.on(event, wrapper)
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called.
   * @param {string[]} events
   * @param {function} callback
   */
  any(events, callback) {
    for (const event of events) {
      this.on(event, (...args) => {
        callback(event, ...args)
      })
    }
  }
}
