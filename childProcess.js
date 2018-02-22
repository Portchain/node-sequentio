const logger = require('logacious')('sequentio')

logger.info('Worker waiting for kickoff message')
process.send('ready')

function kickOffMessageHandler(msg, callback) {
  process.removeAllListeners('message')
  logger.info('Worker received message', msg)
  if(msg.hasOwnProperty('absoluteFilePath')) {
    process.removeListener('message', kickOffMessageHandler)
    require(msg.absoluteFilePath)
    process.send('running')
  }
}

process.on('message', kickOffMessageHandler)

process.on('uncaughtException', (err) => {
  logger.error(err)
  process.send('error')
})
