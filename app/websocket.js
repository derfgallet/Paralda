
module.exports = {
    start: start,
    broadcast: broadcast
};

var _socket = null;
var timers=require('timers');
var GPIO=null;
var MPU6050=null;
var Gyro=null;
var i2c=null;
var broadcastDelay=100; // delay between 2 broadcasts in ms
var SSM=require('./SSM3');
var Platform="Rpi";

function start(httpServer) {
    _socket = require('socket.io')(httpServer);
    _socket.on('connection', onConnection);

    console.log('\tStarting GPIO driver... ');

    if (Platform=="Rpi")
    {
        // GPIO Driver
        GPIO = require('./GPIO');
        GPIO.GPIOInit();
        // Enable Engine START
        GPIO.EnableEngine();

        /*
         GYRO TEST Code

         var i2c = require('i2c-bus');
         var MPU6050 = require('./MPU6050');

         var address = 0x68;
         var i2c1 = i2c.openSync(1);

         var sensor = new MPU6050(i2c1, address);

         var data = sensor.readSync();
         console.log(data);

         */

        // MPU6050 Driver
        i2c = require('i2c-bus');
        var address = 0x68;
        var i2c1 = i2c.openSync(1);
        MPU6050 = require('./MPU6050');
        Gyro  = new MPU6050(i2c1, address);

        // var data = sensor.readSync();

        // TODO : SetInterval BroadCast Data to Room 1 Sockets
    }


    console.log('\tStarted');
    console.log('\tBroadcasting Data every %d ms ...',broadcastDelay)
    //timers.setInterval(
    //    ReadADC,broadcastDelay);
    
};

function onConnection(socket) {

    socket.ParaldaLog = function (data) {
        _socket.emit("LOG", data);
    }

    console.log('[ParalDa] New connection (ip = %s, socketId = %s)', socket.request.socket.remoteAddress, socket.id);
    socket.ParaldaLog('Connected to Server from ip = ' + socket.request.socket.remoteAddress + ', Socket : ' + socket.id);
    socket.join('room1');
    // SSM Init
    //SSM.SSMInit(socket, true); // Simulation On
    SSM.SSMInit(socket, false);
    // Client Disconnection
    socket.on('disconnect', function (data) {
        console.log('[ParalDa] Client disconnect (ip = %s, socketId = %s) : %s', socket.request.socket.remoteAddress, socket.id, data);
        SSM.SSMClose();
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

    socket.on('STOPECU', function(){SSM.StopECU();});

    socket.on('CONNECTECU', function (){console.log('Connect ECU received');SSM.SSMOpen();});

    socket.on('DISCONNECTECU',function(){console.log('Disconnect ECU received');SSM.SSMClose();});

}

/**
 * Transmet des donn�es aux sockets connect�s
 * @returns {undefined}
 */
function broadcast(room, event, args) {
    _socket.sockets.in(room).emit(event, args);
};


