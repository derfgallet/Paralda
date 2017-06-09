
module.exports = {
    start: _Start,
    stop : _Stop
};

var _socket = null;
var timers=require('timers');
var MPU6050=null;
var Gyro=null;
var i2c=null;
var broadcastDelay=100; // delay between 2 broadcasts in ms
var SSM=require('./SSM3');
var GPIO = require('./GPIO');
var Platform="Laptop";

function _Start(httpServer) {
    _socket = require('socket.io')(httpServer);
    _socket.on('connection', onConnection);

    console.log('\tStarting GPIO driver... ');

    if (Platform=="Rpi")
    {
        // Enable Engine START
        GPIO.EnableEngine();

        // MPU6050 Driver
        i2c = require('i2c-bus');
        var address = 0x68;
        var i2c1 = i2c.openSync(1);
        MPU6050 = require('./MPU6050');
        Gyro  = new MPU6050(i2c1, address);

        // var data = sensor.readSync();
        //console.log('\tBroadcasting Data every %d ms ...',broadcastDelay)
        //timers.setInterval(BroadCastData,broadcastDelay);

    }
    // Initiate GPIO Driver
    GPIO.GPIOInit(Platform);
    // Initiate ECU Communication
    SSM.SSMInit(_socket, Platform);

    console.log('\tStarted');

    
};

function _Stop()
{
    // Stop ECU Communication
    SSM.SSMClose();
}

function onConnection(socket) {

    socket.ParaldaLog = function (data) {
        _socket.emit("LOG", data);
    }

    console.log('[ParalDa] New connection (ip = %s, socketId = %s)', socket.request.socket.remoteAddress, socket.id);
    socket.ParaldaLog('Connected to Server from ip = ' + socket.request.socket.remoteAddress + ', Socket : ' + socket.id);
    socket.join('room1');


    socket.on('disconnect', function (data) {
        console.log('[ParalDa] Client disconnect (ip = %s, socketId = %s) : %s', socket.request.socket.remoteAddress, socket.id, data);

    });

    // Engine Emergency Stop
    socket.on('ENGINE', function (data) {
        console.log('Engine Action received %s', data);
        if (data == 'STOP') {
            if (Platform == "Rpi")GPIO.StopEngine();
            socket.ParaldaLog('Engine Stopped.');
        }
        else {
            if (Platform == "Rpi")GPIO.EnableEngine();
            socket.ParaldaLog('Engine Ready.');
        }
    });

    socket.on('DUMP',
        function (FromAddr, ToAddr) {
            socket.ParaldaLog('Dump Asked to Server for addresses 0x' + FromAddr.toString(16) + ' to 0x' + ToAddr.toString(16) + '.');
            SSM.SSMDump(FromAddr, ToAddr)
        });

    socket.on('SAVEADDR',
        function (address, description) {

        });
}

function _Broadcast(room, event, args) {
    _socket.sockets.in(room).emit(event, args);
};

function _BroadCastData()
{
    var data = Gyro.readSync();

    SSM.SSMQuery('1338');
    _Broadcast('room1','DATA',data);
}


