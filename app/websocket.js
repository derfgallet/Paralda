
module.exports = {
    start: start,
    broadcast: broadcast
};

var _socket = null;
var timers=require('timers');
var GPIO=null;
var broadcastDelay=100; // delay between 2 broadcasts in ms
var Platform="";

function start(httpServer) {
    _socket = require('socket.io')(httpServer);
    _socket.on('connection', onConnection);

    console.log('\tStarting GPIO driver... ');

    if (Platform=="Rpi")
    {
        GPIO = require('./GPIO');
        // GPIO Driver
        GPIO.GPIOInit();
        // Enable Engine START
        GPIO.EnableEngine();
        // TODO : ODB SSM
    }


    console.log('\tStarted');
    console.log('\tBroadcasting Data every %d ms ...',broadcastDelay)
    //timers.setInterval(
    //    ReadADC,broadcastDelay);
    
};

function onConnection(socket) {

    socket.ParaldaLog=function(data) { _socket.emit("LOG",data);}

    console.log('[ParalDa] New connection (ip = %s, socketId = %s)', socket.request.socket.remoteAddress, socket.id);
    socket.ParaldaLog('Connected to Server from ip = '+socket.request.socket.remoteAddress+', Socket : '+socket.id);
    socket.join('room1');
    // Client Disconnection
    socket.on('disconnect',function(data){
       console.log('[ParalDa] Client disconnect (ip = %s, socketId = %s) : %s',socket.request.socket.remoteAddress, socket.id,data);
    });
    // Engine Emergency Stop
    socket.on('ENGINE', function(data){
        console.log('Engine Action received %s',data);
        if (data=='STOP')
        {
            if (Platform=="Rpi")GPIO.StopEngine();
            socket.ParaldaLog('Engine Stopped.');
        }
        else {
            if (Platform == "Rpi")GPIO.EnableEngine();
            socket.ParaldaLog('Engine Ready.');
        }
    });
    
};

/**
 * Transmet des donn�es aux sockets connect�s
 * @returns {undefined}
 */
function broadcast(room, event, args) {
    _socket.sockets.in(room).emit(event, args);
};


