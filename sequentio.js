
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const logger = require('logacious')()
const cluster = require('cluster')

function Sequentio() {
  this._workers = []
  this._initializeFunctions = []
  this._nextId = 0
}

Sequentio.prototype.initialize = function(func) {
  this._initializeFunctions.push({
    func: func
  })
}

Sequentio.prototype.worker = function(func, count) {
  this._workers.push({
    func: func,
    count: count || 1
  })
  return this._workers.length - 1
}

Sequentio.prototype.start = function() {
   if(cluster.isMaster) {
    this._initialize(() => {
      this._startWorkers()
    })
  } else {
    logger.info('Worker waiting for kickoff message with worker index')
    process.on('message', (msg) => {
      process.removeAllListeners('message')
      logger.info('Worker received message', msg)
      if(msg.hasOwnProperty('workerIdx')) {
        if(this._workers[msg.workerIdx]) {
          this._workers[msg.workerIdx].func()
        } else {
          logger.error('Worker cannot find proper data with index', msg)
          process.exit(1)
        }
      }
    })
  }
}

Sequentio.prototype._initialize = function(callback) {
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

Sequentio.prototype._startWorkers = function() {
  logger.info('Starting workers', this._workers.length)
  var workerDefinitions = this._workers
  workerDefinitions.forEach((workerDef, idx) => {
    
    logger.info('Worker with id #', idx, 'has', workerDef.count, 'concurrent processes')
    
    for(var j = 0 ; j < workerDef.count ; j++) {
      
      let worker = cluster.fork()
      worker.send({workerIdx: idx})
      this.emit('start', msg.workerIdx, worker)
      
      worker.on('exit', (worker, code, signal) => {
        this.emit('exit', msg.workerIdx, worker)
        if(!IS_PRODUCTION && code !== 0) {
          process.exit(code)
        }
        
        logger.warn(`Worker ${idx} died with (signal ${signal} and exit code ${code}). Restarting.`)
        worker = cluster.fork()
        worker.send({workerIdx: idx})
      })
    }
  })
  
  
  
  process.on('SIGQUIT', function() {
    logger.info('SIGQUIT received, will exit now.')
    process.exit(0)
  })
}

module.exports = Sequentio
