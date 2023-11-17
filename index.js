'use strict';

function isEmpty(obj) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false;
    }
  }
  return true;
}

/**
 * An event emitter helper class that allows to register multiple events at once.
 */
class On {
  constructor(emitter) {
    this.emitter = emitter;
  }

  /**
   * Waits for all passed in events to be fired once. Arguments are passed on as object parameter with keys for each event.
   * Multiple calls to the same event are ignored.
   * @param {string[]} events
   * @param {function} callback
   * @param {boolean} [useFirst=false]
   */
  allOnce(events, callback, useFirst) {
    var status = {};
    var args = {};
    if (useFirst) {
      for (let event of events) {
        status[event] = true;
        this.emitter.once(event, function () {
          delete status[event];
          args[event] = Array.prototype.slice.call(arguments);
          if (isEmpty(status)) {
            callback(args);
          }
        });
      }
    } else {
      var listeners = [];
      var that = this;
      for (let event of events) {
        status[event] = true;
        let listener = function() {
          delete status[event];
          args[event] = Array.prototype.slice.call(arguments);
          if (isEmpty(status)) {
            for (let listener of listeners) {
              that.emitter.removeListener(event, listener);
            }
            callback(args);
          }
        };
        listeners.push(listener);
        this.emitter.on(event, listener);
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
    var status = {};
    var args = {};
    var callbacks = [];
    var emits = 0;
    var emitter = this.emitter;
    for (let event of events) {
      status[event] = true;
      let wrapper = function () {
        var eventArgs = Array.prototype.slice.call(arguments);
        delete status[event];
        args[event] = useFirst && args[event] !== undefined ? args[event] : eventArgs;
        if (isEmpty(status)) {
          emits++;
          if (emits==count) {
            for (let callback of callbacks) {
              emitter.removeListener(callback.event, callback.wrapper);
            }
          }
          status = {};
          for (let event2 of events) {
            status[event2] = true;
          }
          callback(args);
          args = {};
        }
      };
      callbacks.push({ event, wrapper });
      this.emitter.on(event, wrapper);
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
    var status = [{}];
    var args = [{}];
    for (let event of events) {
      status[0][event] = true;
      this.emitter.on(event, function () {
        var newRequired = true;
        for (let i in args) {
          var arg = args[i];
          if (!arg[event]) {
            arg[event] = Array.prototype.slice.call(arguments);
            newRequired = false;
            delete status[i][event];
            break;
          }
        }
        if (newRequired) {
          args.push({
            [event]: Array.prototype.slice.call(arguments)
          });
          if (cacheLimit && cacheLimit < args.length) {
            lifo ? status.pop() : status.shift();
            lifo ? args.pop() : args.shift();
          }
          var queuedStatus = {};
          for (let event2 of events) {
            queuedStatus[event2] = true;
          }
          delete queuedStatus[event];
          status.push(queuedStatus);
        }
        if (isEmpty(status[0])) {
          status.shift();
          callback(args[0]);
          args.shift();
        }
      });
    }
  }

  /**
   * Waits for all passed in events to be fired once. If an event is fired twice once of the events is discarded.
   * @param {string[]} events
   * @param {function} callback
   * @param {boolean} [useFirst=false]
   */
  all(events, callback, useFirst) {
    var status = {};
    var args = {};
    for (let event of events) {
      status[event] = true;
      this.emitter.on(event, function () {
        var eventArgs = Array.prototype.slice.call(arguments);
        delete status[event];
        args[event] = useFirst && args[event] != undefined ? args[event] : eventArgs;
        if (isEmpty(status)) {
          status = {};
          for (let event2 of events) {
            status[event2] = true;
          }
          callback(args);
          args = {};
        }
      });
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called once and then removed as a listener.
   * @param {string[]} events
   * @param {function} callback
   */
  anyOnce(events, callback) {
    var done = false;
    for (let event of events) {
      this.emitter.once(event, function () {
        if (done) {
          return;
        }
        done = true;
        callback(event, ...Array.prototype.slice.call(arguments));
      });
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called up to a given number of events.
   * @param {string[]} events
   * @param {number} count
   * @param {function} callback
   */
  anyMany(events, count, callback) {
    let emits = 0;
    let emitter = this.emitter;
    var callbacks = [];
    for (let event of events) {
      let wrapper = function() {
        emits++;
        if (emits == count) {
          for (let callback of callbacks) {
            emitter.removeListener(callback.event, callback.wrapper);
          }
        }
        callback(event, ...Array.prototype.slice.call(arguments));
      };
      callbacks.push({event, wrapper});
      this.emitter.on(event, wrapper);
    }
  }

  /**
   * If any of the passed in events is triggered that callback is called.
   * @param {string[]} events
   * @param {function} callback
   */
  any(events, callback) {
    for (let event of events) {
      this.emitter.on(event, function () {
        callback(event, ...Array.prototype.slice.call(arguments));
      });
    }
  }

  /**
   * Extends an event emitter with the methods of this class. Both the original emitter methods as well as the new
   * methods are available.
   * @param {EventEmitter} emitter
   * @return {Proxy<EventEmitter>} The extended emitter
   */
  static getExtendedEmitter(emitter) {
    const on = new On(emitter);
    return new Proxy(emitter, {
      get: function (target, name) {
        if (name in target) {
          return target[name];
        }
        if (name in On.prototype) {
          return On.prototype[name].bind(on);
        }
      }
    });
  }
}

module.exports = On;
