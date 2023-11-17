'use strict';

var events = require('events');

var expect = require('chai').expect;

var On = require('../');


describe('On', () => {
  describe('#all()', () => {
    it('should fire an event when all events have been fired while return the last event arguments', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var firstCallback = true;
      on.all(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        if (firstCallback) {
          expect(args.test1).to.deep.equal(['arg1']);
          expect(args.test2).to.deep.equal(['arg2']);
          firstCallback = false;
        } else {
          expect(args.test1).to.deep.equal(['arg6']);
          expect(args.test2).to.deep.equal(['arg5']);
          done();
        }
      });
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
      emitter.emit('test1', 'arg4');
      emitter.emit('test1', 'arg6');
      emitter.emit('test2', 'arg5');
    });

    it('should fire an event when all event have been fired while returning the first event arguments', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      on.all(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        expect(args.test1).to.deep.equal(['arg1']);
        expect(args.test2).to.deep.equal(['arg2']);
        done();
      }, true);
      emitter.emit('test1', 'arg1');
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg2');
    });
  });

  describe('#allOnce()', () => {
    it('should only be fired once with the last arguments passed in', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      on.allOnce(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        expect(args.test1).to.deep.equal(['arg3']);
        expect(args.test2).to.deep.equal(['arg2']);
        done();
      });
      emitter.emit('test1', 'arg1'); // ignored
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg2');
      emitter.emit('test2', 'arg4'); // ignored
    });

    it('should only be fired once with the first arguments passed in', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      on.allOnce(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        expect(args.test1).to.deep.equal(['arg1']);
        expect(args.test2).to.deep.equal(['arg2']);
        done();
      }, true);
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
      emitter.emit('test1', 'arg3'); // ignored
      emitter.emit('test2', 'arg4'); // ignored
    });
  });

  describe('#allMany()', () => {
    it('should only be fired as often as defined with the last arguments passed in', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var count = 0;
      on.allMany(['test1', 'test2'], 2, args => {
        switch (count) {
          case 0:
            expect(Object.keys(args).length).to.equal(2);
            expect(args.test1).to.deep.equal(['arg1']);
            expect(args.test2).to.deep.equal(['arg2']);
            break;
          case 1:
            expect(Object.keys(args).length).to.equal(2);
            expect(args.test1).to.deep.equal(['arg3']);
            expect(args.test2).to.deep.equal(['arg4']);
            expect(emitter.listenerCount('test1')).to.equal(0);
            expect(emitter.listenerCount('test2')).to.equal(0);
        }
        count++;
      });
      emitter.emit('test1', 'arg0'); // overridden
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg4');
      emitter.emit('test2', 'arg5'); // ignored
      done();
    });

    it('should only be fired as often as defined with the first arguments passed in', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var count = 0;
      on.allMany(['test1', 'test2'], 2, args => {
        switch(count) {
          case 0:
            expect(Object.keys(args).length).to.equal(2);
            expect(args.test1).to.deep.equal(['arg1']);
            expect(args.test2).to.deep.equal(['arg2']);
            break;
          case 1:
            expect(Object.keys(args).length).to.equal(2);
            expect(args.test1).to.deep.equal(['arg3']);
            expect(args.test2).to.deep.equal(['arg4']);
            expect(emitter.listenerCount('test1')).to.equal(0);
            expect(emitter.listenerCount('test2')).to.equal(0);
        }
        count++;
      }, true);
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg4');
      emitter.emit('test1', 'arg5'); // ignored
      emitter.emit('test2', 'arg6'); // ignored
      done();
    });
  });

  describe('#allCached()', () => {
    it('should fire once all events have been fired and cache previous multiple events for future callback', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var count = 0;
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        switch (count) {
          case 0:
            expect(args.test1).to.deep.equal(['arg1']);
            expect(args.test2).to.deep.equal(['arg2']);
            break;
          case 1:
            expect(args.test1).to.deep.equal(['arg3']);
            expect(args.test2).to.deep.equal(['arg4']);
            done();
            break;
        }
        count++;
      });
      emitter.emit('test1', 'arg1');
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg2');
      emitter.emit('test2', 'arg4');
    });

    it ('should limit the cache size and discard oldest entries first', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var count = 0;
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        switch (count) {
          case 0:
            expect(args.test1).to.deep.equal(['arg1']);
            expect(args.test2).to.deep.equal(['arg2']);
            break;
          case 1:
            expect(args.test1).to.deep.equal(['arg3']);
            expect(args.test2).to.deep.equal(['arg4']);
            done();
            break;
        }
        count++;
      }, 2);
      emitter.emit('test1', 'arg0'); // overwritten
      emitter.emit('test1', 'arg1');
      emitter.emit('test1', 'arg3');
      emitter.emit('test2', 'arg2');
      emitter.emit('test2', 'arg4');
    });

    it('should limit the cache size and discard newest entries first', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var count = 0;
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2);
        switch (count) {
          case 0:
            expect(args.test1).to.deep.equal(['arg1']);
            expect(args.test2).to.deep.equal(['arg2']);
            break;
          case 1:
            expect(args.test1).to.deep.equal(['arg3']);
            expect(args.test2).to.deep.equal(['arg4']);
            done();
            break;
        }
        count++;
      }, 2, true);
      emitter.emit('test1', 'arg1');
      emitter.emit('test1', 'arg3');
      emitter.emit('test1', 'arg5'); // ignored
      emitter.emit('test2', 'arg2');
      emitter.emit('test2', 'arg4');
    });
  });

  describe('#any()', () => {
    it('should fire if any of the events passed in is triggered', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var counter = 0;
      on.any(['test1', 'test2'], (event, args) => {
        switch (counter) {
          case 0:
            expect(event).to.equal('test1');
            expect(args).to.equal('arg1');
            break;
          case 1:
            expect(event).to.equal('test2');
            expect(args).to.equal('arg2');
            done();
        }
        counter++;
      });
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
    });
  });

  describe('#anyMany()', () => {
    it('should fire as often as the desired and then no more', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      var counter = 0;
      on.anyMany(['test1', 'test2'], 2, (event, args) => {
        switch (counter) {
          case 0:
            expect(event).to.equal('test1');
            expect(args).to.equal('arg1');
            break;
          case 1:
            expect(event).to.equal('test2');
            expect(args).to.equal('arg2');
            expect(emitter.listenerCount('test1')).to.equal(0);
            expect(emitter.listenerCount('test2')).to.equal(0);
            done();
            break;
          case 2:
            expect.fail();
        }
        counter++;
      });
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2');
      emitter.emit('test2', 'arg3'); // ignored
    });
  });

  describe('#anyOnce()', () => {
    it('should fire only once as soon as any of the given events has been triggered', done => {
      var emitter = new events.EventEmitter();
      var on = new On(emitter);
      on.anyOnce(['test1', 'test2'], (event, args) => {
          expect(event).to.equal('test1');
          expect(args).to.equal('arg1');
      });
      emitter.emit('test1', 'arg1');
      emitter.emit('test2', 'arg2'); // ignored
      expect(emitter.listenerCount('test1')).to.equal(0);
      expect(emitter.listenerCount('test2')).to.equal(0);
      done();
    });
  });

  describe('#getExternalEmitter()', () => {
    it('should act like a normal emitter', done => {
      const emitter = On.getExtendedEmitter(new events.EventEmitter());
      expect(emitter.on).to.be.a('function');
      expect(emitter.once).to.be.a('function');
      expect(emitter.emit).to.be.a('function');
      emitter.on('test', done);
      emitter.emit('test');
    });

    it('should have all extended methods', done => {
      const emitter = On.getExtendedEmitter(new events.EventEmitter());
      expect(emitter.all).to.be.a('function');
      expect(emitter.allOnce).to.be.a('function');
      expect(emitter.allMany).to.be.a('function');
      expect(emitter.allCached).to.be.a('function');
      expect(emitter.any).to.be.a('function');
      expect(emitter.anyOnce).to.be.a('function');
      expect(emitter.anyMany).to.be.a('function');
      emitter.all(['test1', 'test2'], () => done());
      emitter.emit('test1');
      emitter.emit('test2');
    });
  });
});
