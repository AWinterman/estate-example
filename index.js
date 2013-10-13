// Despite the fact that any number of state changes may happen while a stream
// is backed up, `estate` will only ever hold on to one at a time. The stream
// it writes to, on the other hand, well that's up to the client.

var EE = require('events').EventEmitter
  , through2 = require('through2')
  , estate = require('estate')
  , util = require('util')
  , nopt

var state = estate()
  , ee = new EE
  , i = 0

// This is a slow duplex stream it waits a tenth of a second before it is
// ready for the next chunk. A highWaterMark larger than 1 will cause it to
// buffer state change events, which you may or may not want.
var slow = through2(
    {objectMode: true, highWaterMark: hwm}
  , wait_then_push
  , note_end
)

state.listen(ee, 'hey', ['value'])
state.pipe(slow).pipe(report(state, slow))

// Every `event_speed` (in milliseconds), update the state. Also check to see
// if we should close
var emit = setInterval(update, event_speed)

var j = 0

function update() {
  ee.emit('hey', j++)

  if(j > close_after) {
    // even though events will still be emitted to the state, it will no
    // longer propagate them down the stream
    state.close()
  } else {
    console.log(j)
  }
}

// simply waits `destination_rate` miliseconds before pushing the data on to
// the next stream
function wait_then_push(chunk, encoding, cb) {
  var self = this

  setTimeout(done, destination_rate)

  function done() {
    self.push(chunk)
    cb()
    i++
  }
}

function note_end(cb) {
  console.log('ENDED')
  cb()
}

// log information about the state, the state's stream, and the target
function report(source, target, log) {

  return  through2({objectMode: true}, function(chunk, enc, cb) {
    if(!log) {
      process.stdout.write(
          'chunk: ' + util.inspect(chunk) +
          ' | ' +
          'source buffer length: ' + source._readableState.length +
          ' | ' +
          'slow reader buffer length: ' + target._writableState.length +
          ' | ' +
          'chunk index: ' + i +
          ' | ' +
          '\r'
      )
    }

    cb()
  })
}
