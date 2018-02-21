

const assert = require('assert')
const Sequentio = require('../sequentio.js')

describe('sequentio', () => {

  it('single worker', () {
    let sequentio = new Sequentio()
    
    let workerIndex = sequentio.worker(() => {
      process.send('single-worker', true)
    })

    sequentio.on('worker', (idx, worker) => {
      
    })
  })


})
