'use strict';

function isEmpty(obj) {
  for (var prop in obj) {
    return false;
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
   * @param {boolean} [useFirst]
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
   * Waits for all passed in events to be fired once. If an event is fired twice it's cached for the next round of callbacks.
   * @param {string[]} events
   * @param {function} callback
   */
  allCached(events, callback) {
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
   * * If any of the passed in events is triggered that callback is called once and then removed as a listener.
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
   * If any of the passed in events is triggered that callback is called.
   * @param {string[]} events
   * @param {function} callback
   */
  any(events, callback) {
    for (let event of events) {
      this.emitter.once(event, function () {
        callback(event, ...Array.prototype.slice.call(arguments));
      });
    }
  }
}

module.exports = On;
