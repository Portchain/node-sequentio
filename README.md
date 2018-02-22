# Sequentio

Sequentio manages a multiprocessed node app and gives you the ability to run
initialization logic before your cluster workers start.

It also allows you to start long running child processes in parallel with your
http workers.

```javascript
const Sequentio = require('sequentio')
const sequentio = new Sequentio()

sequentio.initialize((done) => {
  migrateMyDatabase((err) => {
    done(err)
  })
})

// if a worker crashes within that delay (in milliseconds), it won't be restarted.
//   set it to -1 to disable
//   default delay is 30 seconds
sequentio.setCrashToleranceDelay(10 * 1000) 
sequentio.worker(path.join(__dirname, 'lib/myWebServer.js'), os.cpus().length)
sequentio.worker(path.join(__dirname, 'lib/myLongRunningCronJob.js'), 1)
sequentio.start()
```