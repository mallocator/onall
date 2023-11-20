'use strict'

import {expect} from 'chai'
import On from '../index.js'

describe('On', () => {
  describe('#all()', () => {
    it('should fire an event when all events have been fired while return the last event arguments', done => {
      const on = new On()
      let firstCallback = true
      on.all(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        if (firstCallback) {
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          firstCallback = false
        } else {
          expect(args.test1).to.deep.equal(['arg6'])
          expect(args.test2).to.deep.equal(['arg5'])
          done()
        }
      })
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
      on.emit('test1', 'arg4')
      on.emit('test1', 'arg6')
      on.emit('test2', 'arg5')
    })

    it('should fire an event when all event have been fired while returning the first event arguments', done => {
      const on = new On()
      on.all(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        expect(args.test1).to.deep.equal(['arg1'])
        expect(args.test2).to.deep.equal(['arg2'])
        done()
      }, true)
      on.emit('test1', 'arg1')
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg2')
    })
  })

  describe('#allOnce()', () => {
    it('should only be fired once with the last arguments passed in', done => {
      const on = new On()
      on.allOnce(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        expect(args.test1).to.deep.equal(['arg3'])
        expect(args.test2).to.deep.equal(['arg2'])
        done()
      })
      on.emit('test1', 'arg1') // ignored
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg2')
      on.emit('test2', 'arg4') // ignored
    })

    it('should only be fired once with the first arguments passed in', done => {
      const on = new On()
      on.allOnce(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        expect(args.test1).to.deep.equal(['arg1'])
        expect(args.test2).to.deep.equal(['arg2'])
        done()
      }, true)
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
      on.emit('test1', 'arg3') // ignored
      on.emit('test2', 'arg4') // ignored
    })
  })

  describe('#allMany()', () => {
    it('should only be fired as often as defined with the last arguments passed in', done => {
      const on = new On()
      let count = 0
      on.allMany(['test1', 'test2'], 2, args => {
        switch (count) {
        case 0:
          expect(Object.keys(args).length).to.equal(2)
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          break
        case 1:
          expect(Object.keys(args).length).to.equal(2)
          expect(args.test1).to.deep.equal(['arg3'])
          expect(args.test2).to.deep.equal(['arg4'])
          expect(on.listenerCount('test1')).to.equal(0)
          expect(on.listenerCount('test2')).to.equal(0)
        }
        count++
      })
      on.emit('test1', 'arg0') // overridden
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg4')
      on.emit('test2', 'arg5') // ignored
      done()
    })

    it('should only be fired as often as defined with the first arguments passed in', done => {
      const on = new On()
      let count = 0
      on.allMany(['test1', 'test2'], 2, args => {
        switch(count) {
        case 0:
          expect(Object.keys(args).length).to.equal(2)
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          break
        case 1:
          expect(Object.keys(args).length).to.equal(2)
          expect(args.test1).to.deep.equal(['arg3'])
          expect(args.test2).to.deep.equal(['arg4'])
          expect(on.listenerCount('test1')).to.equal(0)
          expect(on.listenerCount('test2')).to.equal(0)
        }
        count++
      }, true)
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg4')
      on.emit('test1', 'arg5') // ignored
      on.emit('test2', 'arg6') // ignored
      done()
    })
  })

  describe('#allCached()', () => {
    it('should fire once all events have been fired and cache previous multiple events for future callback', done => {
      const on = new On()
      let count = 0
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        switch (count) {
        case 0:
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          break
        case 1:
          expect(args.test1).to.deep.equal(['arg3'])
          expect(args.test2).to.deep.equal(['arg4'])
          done()
          break
        }
        count++
      })
      on.emit('test1', 'arg1')
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg2')
      on.emit('test2', 'arg4')
    })

    it ('should limit the cache size and discard oldest entries first', done => {
      const on = new On()
      let count = 0
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        switch (count) {
        case 0:
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          break
        case 1:
          expect(args.test1).to.deep.equal(['arg3'])
          expect(args.test2).to.deep.equal(['arg4'])
          done()
          break
        }
        count++
      }, 2)
      on.emit('test1', 'arg0') // overwritten
      on.emit('test1', 'arg1')
      on.emit('test1', 'arg3')
      on.emit('test2', 'arg2')
      on.emit('test2', 'arg4')
    })

    it('should limit the cache size and discard newest entries first', done => {
      const on = new On()
      let count = 0
      on.allCached(['test1', 'test2'], args => {
        expect(Object.keys(args).length).to.equal(2)
        switch (count) {
        case 0:
          expect(args.test1).to.deep.equal(['arg1'])
          expect(args.test2).to.deep.equal(['arg2'])
          break
        case 1:
          expect(args.test1).to.deep.equal(['arg3'])
          expect(args.test2).to.deep.equal(['arg4'])
          done()
          break
        }
        count++
      }, 2, true)
      on.emit('test1', 'arg1')
      on.emit('test1', 'arg3')
      on.emit('test1', 'arg5') // ignored
      on.emit('test2', 'arg2')
      on.emit('test2', 'arg4')
    })
  })

  describe('#any()', () => {
    it('should fire if any of the events passed in is triggered', done => {
      const on = new On()
      let counter = 0
      on.any(['test1', 'test2'], (event, args) => {
        switch (counter) {
        case 0:
          expect(event).to.equal('test1')
          expect(args).to.equal('arg1')
          break
        case 1:
          expect(event).to.equal('test2')
          expect(args).to.equal('arg2')
          done()
        }
        counter++
      })
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
    })
  })

  describe('#anyMany()', () => {
    it('should fire as often as the desired and then no more', done => {
      const on = new On()
      let counter = 0
      on.anyMany(['test1', 'test2'], 2, (event, args) => {
        switch (counter) {
        case 0:
          expect(event).to.equal('test1')
          expect(args).to.equal('arg1')
          break
        case 1:
          expect(event).to.equal('test2')
          expect(args).to.equal('arg2')
          expect(on.listenerCount('test1')).to.equal(0)
          expect(on.listenerCount('test2')).to.equal(0)
          done()
          break
        case 2:
          expect.fail()
        }
        counter++
      })
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2')
      on.emit('test2', 'arg3') // ignored
    })
  })

  describe('#anyOnce()', () => {
    it('should fire only once as soon as any of the given events has been triggered', done => {
      const on = new On()
      on.anyOnce(['test1', 'test2'], (event, args) => {
        expect(event).to.equal('test1')
        expect(args).to.equal('arg1')
      })
      on.emit('test1', 'arg1')
      on.emit('test2', 'arg2') // ignored
      expect(on.listenerCount('test1')).to.equal(0)
      expect(on.listenerCount('test2')).to.equal(0)
      done()
    })
  })
})
