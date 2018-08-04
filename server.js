const WebSocket = require('ws')

const wss = new WebSocket.Server({
  port: 8000
})

const ws_clients = {}
const INIT_MESSAGE = 'init-msg'
const SEND_MESSAGE = 'send-msg'
const CONTROL_SUCCESS = JSON.stringify({type: 'init-msg', payload: 'websocket connection established !'})

wss.on('connection', function connection (ws, req) {
  ws.on('message', function (incoming) {
    on_message(ws, req, incoming, incoming !== 'undefined' && incoming[0] === '{')
  })
  ws.on('close', function (status) {
    on_close(ws, status)
  })
  ws.send(CONTROL_SUCCESS)
})

function send_msg (receiver, msg) {
  let ws = ws_clients[receiver]
  if (ws !== 'undefined') {
    if (ws.name !== 'undefined') {
      console.log('receiver : ' + ws.name)
    }
    ws.send(msg)
  }
}

function on_message (ws, req, incoming, isValid) {
  if (!isValid) return
  console.log('received: %s', incoming)
  let message = JSON.parse(incoming)

  if (message.type === INIT_MESSAGE) {
    ws.name = message.payload.name
    ws.send(CONTROL_SUCCESS)
    ws_clients[message.payload.name] = ws
  }

  if (message.type === SEND_MESSAGE) {
    send_msg(message.payload.receiver, message.payload.data)
  }
}

function on_close (ws, status) {
  delete ws_clients[ws.name]
  console.log('closing socket : ' + ws.name + ', status : ' + status)
}