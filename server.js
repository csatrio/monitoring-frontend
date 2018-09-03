const WebSocket = require('ws')
const axios = require('axios')

const wss = new WebSocket.Server({
  port: 7000
})

const ws_clients = {}
const web_clients = {}
const CONTROL_SUCCESS = 'CONNECTED'
const webclient_t = 1
const device_t = 0
const ACTIVE = 'ACTIVE'
const DOWN = 'DOWN'

wss.on('connection', function connection(ws, req) {
  let header = req.headers
  console.log(header)

  if (header.deviceid) { // if esp device
    ws.deviceid = String(header.deviceid)
    ws.status = String(header.status)
    ws.type = device_t
    ws_clients[ws.deviceid] = ws
    
  } else { // if web client
    ws.key = String(header.sec_websocket_key)
    web_clients[ws.key] = ws
  }

  ws.on('message', function (incoming) {
    if (ws.deviceid) on_message_device(ws, req, incoming, incoming !== 'undefined' && incoming[0] === '{')
    else on_message_webclient(ws, req, incoming, incoming !== 'undefined' && incoming[0] === '{')
  })

  ws.on('close', function (status) {
    if (ws.deviceid) on_close_device(ws, status)
    else on_close_webclient(ws, status)
  })
  
})

function update_api_status(deviceid, status) {
  var device = { id: deviceid, status: status }
  var _url = '/api/device/' + deviceid + '/'
  axios.patch(_url, device)
    .then(response => {
      console.log('update status for ' + _url + ' : ' + response.status)
    })
    .catch(err => {
    })
}

function send_msg(receiver, receiver_type, msg) {
  if (receiver_type === device_t) {
    var _ws = ws_clients[receiver]
    if (_ws !== 'undefined') _ws.send(msg)
  } else if (receiver_type === webclient_t) {
    var _wsb = web_clients[receiver]
    if (_wsb !== 'undefined') _wsb.send(msg)
  } 
}

function on_message_device(ws, req, incoming, isJson) {
  console.log('received from device: %s', incoming)
  if (incoming === ACTIVE || incoming === DOWN) {
    ws.status = incoming === ACTIVE ? 'Active' : 'Down'
    // update api data
    update_api_status(ws.deviceid, ws.status)
    // broadcast voltage event to all webclient
    for (var key in web_clients) {
      let c = web_clients[key]
      var _data = JSON.stringify({
        deviceid: ws.deviceid,
        status: ws.status
      })
      c.send(_data)
    }
  }
}

function on_message_webclient(ws, req, incoming, isJson) {
  console.log('received from webclient: %s', incoming)
  // check all device status
  if (incoming === 'all_device_status') {
    var _list = []
    for (var key in ws_clients) {
      let c = ws_clients[key]
      console.log(c.deviceid)
      _list.push({ device: c.deviceid, status: c.status })
    }
    ws.send(JSON.stringify(_list))
  }
}

function on_close_device(ws, status) {
  delete ws_clients[ws.deviceid]
  console.log('closing device : ' + ws.deviceid + ', status : ' + status)
}

function on_close_webclient(ws, status) {
  delete web_clients[ws.deviceid]
  console.log('closing webclient : ' + ws.key + ', status : ' + status)
}