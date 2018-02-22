process.on('message', msg => {
  console.log('MSG', msg)
  if(msg === 'throw') {
    throw new Error('I am an expected Error')
  }
})
