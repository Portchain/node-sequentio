

const assert = require('assert')
const path = require('path')
const Sequentio = require('../sequentio.js')

describe('sequentio', () => {

  it('single worker', (done) => {
    let sequentio = new Sequentio()
    
    sequentio.worker(path.join(__dirname, './child-processes/singleWorker.js'))

    sequentio.on('worker-started', (idx, worker) => {
      worker.on('message', msg => {
        if(msg && msg.singleWorker) {
          sequentio.kill()
          done()
        }
      })
    })
    sequentio.start()
  })

  it('dual worker', (done) => {
    let sequentio = new Sequentio()
    
    let workerIndex = sequentio.worker(path.join(__dirname, './child-processes/dualWorker.js'), 2)

    let workerCount = 0;
    sequentio.on('worker-started', (idx, worker) => {
      worker.on('message', msg => {
        if(msg && msg.dualWorker) {
          workerCount ++
          if(workerCount === 2) {
            sequentio.kill()
            done()
          }
        }
        
      })
    })
    sequentio.start()
  })
  

  it('single worker that throws get restarted', (done) => {
    let sequentio = new Sequentio()
    
    let workerIndex = sequentio.worker(path.join(__dirname, './child-processes/throwingWorker.js'))
    sequentio.setCrashToleranceDelay(-1)
    var count = 0
    sequentio.on('worker-running', (idx, worker) => {
      count ++
      if(count == 1) {
        worker.send('throw')
      } else {
        sequentio.kill()
        done()
      }
    })
    sequentio.start()
  })

  it('worker that throws after tolerance delay is restarted', (done) => {
    let sequentio = new Sequentio()
    
    let workerIndex = sequentio.worker(path.join(__dirname, './child-processes/throwingWorker.js'))
    sequentio.setCrashToleranceDelay(500)
    var count = 0
    sequentio.on('worker-running', (idx, worker) => {
      count ++
      if(count == 1) {
        setTimeout(() => {
          worker.send('throw')
        }, 600)
      } else {
        sequentio.kill()
        done()
      }
    })
    sequentio.start()
  })

  it('worker that throws before tolerance delay is not restarted', (done) => {
    let sequentio = new Sequentio()
    
    let workerIndex = sequentio.worker(path.join(__dirname, './child-processes/throwingWorker.js'))
    sequentio.setCrashToleranceDelay(600)
    var count = 0
    sequentio.on('worker-running', (idx, worker) => {
      count ++
      assert.equal(count, 1)
      setTimeout(() => {
        worker.send('throw')
      }, 300)
      setTimeout(() => {
        sequentio.kill()
        done()
      }, 1000)
    })
    sequentio.start()
  })

  it('initialization step gets executed', (done) => {
    let sequentio = new Sequentio()
    var count = 0
    sequentio.initialize((callback) => {
      callback()
      done()
    })
    sequentio.start()
  })
  

  it('initialization steps executed in order', (done) => {
    let sequentio = new Sequentio()
    let execution = []
    sequentio.initialize((callback) => {
      execution.push(1)
      callback()
    })
    sequentio.initialize((callback) => {
      execution.push(2)
      callback()
    })
    sequentio.initialize((callback) => {
      assert.equal(execution[0], 1)
      assert.equal(execution[1], 2)
      callback()
      done()
    })
    sequentio.start()
  })

  it('initialization step gets executed before worker is started', (done) => {
    let sequentio = new Sequentio()
    let initialized = false
    sequentio.initialize((callback) => {
      initialized = true
      callback()
    })
    sequentio.worker(path.join(__dirname, './child-processes/singleWorker.js'))

    sequentio.on('worker-started', (idx, worker) => {
      assert.ok(initialized)
    })
    sequentio.on('worker-running', () => {
      assert.ok(initialized)
      sequentio.kill()
      done()
    })
    sequentio.start()
  })

})
