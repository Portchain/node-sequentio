
const logger = require('logacious')()
const path = require('path')
const cluster = require('cluster')
const EventEmitter = require('events')

class Sequentio extends EventEmitter {

  constructor() {
    super()
    
    this._workers = []
    this._initializeFunctions = []
    this._nextId = 0
    this._workerPool = []
    this._crashToleranceDelay = 30 * 1000
    cluster.setupMaster({
      exec: path.join(__dirname, 'childProcess.js')
    })
  }

  setCrashToleranceDelay(crashToleranceDelay) {
    this._crashToleranceDelay = crashToleranceDelay
  }

  initialize(func) {
    this._initializeFunctions.push({
      func: func
    })
  }

  worker(absoluteFilePath, count) {
    this._workers.push({
      idx: this._workers.length,
      absoluteFilePath: absoluteFilePath,
      count: count || 1,
      childrenProcesses: []
    })
    return this._workers.length - 1
  }

  start() {
    this._initialize(() => {
      this._startWorkers()
    })
  }
  kill() {
    logger.info('Killing all workers')
    this._workerPool.forEach((worker) => {
      worker.kill('SIGQUIT')
    })
    this._workerPool = []
  }

  _initialize(callback) {
    if(this._initializeFunctions && this._initializeFunctions.length > 0) {
      let initializeFuncData = this._initializeFunctions.shift()
      initializeFuncData.func((err) => {
        if(err) {
          logger.error(err)
          process.exit(1)
        } else {
          this._initialize(callback)
        }
      })
    } else {
      logger.info('All initialization function successful.')
      callback()
    }
  }

  _startWorker(workerDef) {
    let worker = cluster.fork()
    this._workerPool.push(worker)
    this.emit('worker-started', workerDef.idx, worker)

    let startedTime = Date.now()
    const cleanupHandlers = () => {
      if(worker) {
        worker.removeListener('message', messageHandler)
        worker.removeListener('exit', exitHandler)
      }
    }
    const messageHandler = (msg) => {
      if(msg === 'ready') {
        worker.send({absoluteFilePath: workerDef.absoluteFilePath})
      } else if(msg === 'running') {
        logger.info(`Worker ${workerDef.idx} running`)
        this.emit('worker-running', workerDef.idx, worker)
      } else if(msg === 'error') {

        worker.kill()
        cleanupHandlers()
        if((Date.now() - startedTime) < this._crashToleranceDelay) {
          logger.error('Worker errored. It failed too soon after starting. It will not be restarted.')
        } else {
          logger.error('Worker errored. Restarting it.')
          setTimeout(() => {
            // fork the stack with a timeout to avoid stack overflow
            this._startWorker(workerDef)
          })
        }
      }
    }
    
    const exitHandler = (w, code, signal) => {
      worker.removeListener('message', messageHandler)
      this.emit('worker-exited', workerDef.idx, worker)
      logger.info(`Worker ${workerDef.idx} died with (signal ${signal} and exit code ${code})`)
      cleanupHandlers()
    }
    worker.on('message', messageHandler)
    
    worker.on('exit', exitHandler)
  }

  _startWorkers() {
    logger.info('Starting workers', this._workers.length)
    var workerDefinitions = this._workers
    
    workerDefinitions.forEach((workerDef) => {
      logger.info('Worker with id #', workerDef.idx, 'has', workerDef.count, 'concurrent processes')
      for(var j = 0 ; j < workerDef.count ; j++) {
        this._startWorker(workerDef)
      }
    })
    
    process.on('SIGQUIT', function() {
      logger.info('SIGQUIT received, will exit now.')
      process.exit(0)
    })
  }
}

module.exports = Sequentio
