
module.exports = {
    start: _Start,
    stop : _Stop
};

var _DEBUG=false;

var timers=require('timers');
var SSM=require('./SSM3-1');
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

// Kalman Filter Section
var KalmanFilter=require('./KalmanFilter');

var KalmanX=new KalmanFilter;
var KalmanY=new KalmanFilter;
var KalmanTimer=0;
var KalmanDt=0;
/* IMU Data */
var MPUData;
var accX=0.0, accY=0.0, accZ=0.0;
var gyroX=0.0, gyroY=0.0, gyroZ=0.0;
var tempRaw=0.0;

var gyroXangle=0.0, gyroYangle=0.0; // Angle calculate using the gyro only
var compAngleX=0.0, compAngleY=0.0; // Calculated angle using a complementary filter
var kalAngleX=0.0, kalAngleY=0.0; // Calculated angle using a Kalman filter

//var Platform="Rpi";
var Platform="laptop";

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
        MPUData = Gyro.readSync();

        var roll  = MPUData.rotation.x;
        var pitch = MPUData.rotation.y;

        KalmanX.setAngle(roll);
        KalmanY.setAngle(pitch);
        gyroXangle = roll;
        gyroYangle = pitch;
        compAngleX = roll;
        compAngleY = pitch;

    }
    else
    {
        KalmanX.setAngle(0);
        KalmanY.setAngle(0);
        gyroXangle = 0;
        gyroYangle = 0;
        compAngleX = 0;
        compAngleY = 0;
    }

    console.log('Loading Conf. file ...');
    telemetryConf=loadConf();
    console.log('\tBroadcasting Data every %d ms ...',broadcastDelay)
    timers.setInterval(_BroadCastData,broadcastDelay);
    console.log('\tStarted');

    KalmanTimer=Date.now();
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
        SSM.StopECU();
        //SSM.reEmit();
    });

    socket.on('TELEMETRY',function(Status){
       if (Status=='ON') {
           console.log('***** telemetry ON *****');
           telemetryStatus = true;
       }
        else {
           console.log('***** telemetry OFF *****');
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
/*
 double dt = (double)(micros() - timer) / 1000000; // Calculate delta time
 timer = micros();
 */
        KalmanDt= (Date.now()-KalmanTimer)/1000;
        KalmanTimer=Date.now();
        console.log('KalmanDt=',KalmanDt);

        if (Platform == "Rpi")
        {
            var data = Gyro.readSync();
            //gyroscope data
            telemetryData.GyroX=parseFloat(data.rotation.x);
            telemetryData.GyroY=parseFloat(data.rotation.y);
        }
        else
        {
            telemetryData.GyroX=(Math.random()*20)-10;
            telemetryData.GyroY=10+(Math.random()*20)-10;
        }

        var SSMT = SSM.SSMTelemetry(telemetryConf);
        // ECU Data
        // var str=JSON.stringify(SSMT);

        telemetryData.RPM = parseInt(SSMT['ECURPMEngine']);
        telemetryData.BatteryVoltage = parseInt(SSMT['BatteryVoltage']);
        telemetryData.CoolantTemp = parseInt(SSMT['CoolantTemp']);
        telemetryData.AirflowSensor = parseInt(SSMT['AirflowSensor']);
        telemetryData.EngineLoad = parseInt(SSMT['EngineLoad']);
        telemetryData.ThrottlePosition = parseInt(SSMT['ThrottlePosition']);
        telemetryData.O2Average = parseInt(SSMT['O2Average']);
        telemetryData.ExhaustTemp = parseInt(SSMT['ExhaustTemp']);

        /*
         "":"fbe4",
         "":"fc0d",
         "AirflowSensor":"fbe0",
         "EngineLoad":"fc06",
         "ThrottlePosition":"fc2b",
         "O2Average":"fbe3",
         "ExhaustTemp":"fbe6"
         */

        _Broadcast('room1', 'DATA', telemetryData);
    }
}


