
module.exports = {
    start: _Start,
    stop : _Stop
};
var timers=require('timers');
var SSM=require('./SSM3');
var GPIO = require('./GPIO');
var fs=require('fs');

var _socket = null;
var MPU6050=null;
var Gyro=null;
var i2c=null;
var broadcastDelay=100; // delay between 2 broadcasts in ms
var telemetryStatus=false;
var telemetryConf={};
var telemetryData={};

var Platform="Rpi";

function _Start(httpServer) {
    _socket = require('socket.io')(httpServer);
    _socket.on('connection', onConnection);

    console.log('\tStarting GPIO driver... ');

    // Initiate GPIO Driver
    GPIO.GPIOInit(Platform);
    // Initiate ECU Communication
    SSM.SSMInit(_socket, Platform);

    if (Platform=="Rpi")
    {
        // Enable Engine START
        GPIO.EnableEngine();
        // Disable Starter
        GPIO.StopIgnition();

        // MPU6050 Driver
        i2c = require('i2c-bus');
        var address = 0x68; //MPU6050 i2c address
        var i2c1 = i2c.openSync(1);
        MPU6050 = require('./MPU6050');
        console.log("Gyroscope init.");
        Gyro  = new MPU6050(i2c1, address);
        console.log('Loading Conf. file ...');
        telemetryConf=loadConf();
        console.log('\tBroadcasting Data every %d ms ...',broadcastDelay)
        timers.setInterval(_BroadCastData,broadcastDelay);

    }
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
        telemetryStatus=false;
        SSM.SSMTelemetryStop();
    });

    // Engine emergency Stop
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

    // Engine Ignition
    socket.on('IGNITION', function (data) {
        console.log('Ignition received %s', data);
        if (data == 'STOP') {
            if (Platform == "Rpi") GPIO.StopIgnition();
            socket.ParaldaLog('Ignition Stopped.');
        }
        else {
            if (Platform == "Rpi") GPIO.StartIgnition();
            socket.ParaldaLog('Ignition in progress.');
        }
    });

    socket.on('DUMP',
        function (FromAddr, ToAddr, ToFile) {
            socket.ParaldaLog('Dump Asked to Server for addresses 0x' + FromAddr.toString(16) + ' to 0x' + ToAddr.toString(16) + '.');
            SSM.SSMDump(FromAddr, ToAddr,ToFile)
        });

    socket.on('LISTFILES',
        function (){
            fs.readdir("./app/data", function(err, items)
            {
                socket.emit('FILESLIST',items);

            });
        });

    socket.on('GETFILE',function (filename,id){

        var jsonfile = require('jsonfile');
        var file = './app/data/'+filename;
        var fileContent=jsonfile.readFileSync(file);

        socket.emit('FILECONTENT',fileContent,id);
    });

    socket.on('SAVEADDR',
        function (address, description) {

        });

    socket.on('MODCONF',
        function(key,value){
            var jsonfile = require('jsonfile');
            var file = './app/data/conf.json';
            var fileContent=jsonfile.readFileSync(file);

            fileContent[key]=value;

            jsonfile.writeFile(file, fileContent, function (err) {});

            // Reload Conf File for telemetry.
            loadConf();
        });

    socket.on('STOPECU',function(){
        //SSM.StopECU();
        SSM.reEmit();
    });

    socket.on('TELEMETRY',function(Status){
       if (Status=='ON')
           telemetryStatus=true;
        else {
           telemetryStatus = false;
            SSM.SSMTelemetryStop();
        }
    });
}

function loadConf()
{
    var jsonfile = require('jsonfile');
    var file = './app/data/conf.json';
    var fileContent=jsonfile.readFileSync(file);

    return fileContent;
}

function _Broadcast(room, event, args) {
    _socket.sockets.in(room).emit(event, args);
};

function _BroadCastData()
{
    if (telemetryStatus) {
        var data = Gyro.readSync();
        var SSMT = SSM.SSMTelemetry(telemetryConf);

        //gyroscope data
        telemetryData.GyroX=parseFloat(data.rotation.x);
        telemetryData.GyroY=parseFloat(data.rotation.y);
        // ECU Data
        telemetryData.RPM = parseInt(SSMT['ECURPMEngine']);


        _Broadcast('room1', 'DATA', telemetryData);
    }
}


