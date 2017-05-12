/**
 * Created by fgallet on 21/04/2017.
 */


module.exports = {
    SSMInit: _SSMInit,
    SSMOpen: _SSMOpen,
    SSMDump: _SSMDump,
    SSMBurstDump: _SSMBurstDump,
    SSMQuery: _SSMQuery,
    SSMClose: _SSMClose,
    StopECU: _StopECU
};

// Source : http://www.alcyone.org.uk/ssm/protocol.html
// UART Settings : 1953 bauds / 8 bits data / 1 bit stop / parity Even
//
// Commands :
// 12	00	00	00	Stop
// 78	msb	lsb	00	Read data from ECU address
// AA	msb	lsb	data	Write data to address
// 00	46	48	49	Get ROM ID
//
// answers format (3 bytes): msb lsb data
// default Memory Mapping
/*
 [7332]
 Name=1993-1994 NA
 BatteryVoltageAddress=1335
 VehicleSpeedAddress=1336
 EngineSpeedAddress=1338
 CoolantTempAddress=1337
 IgnitionAdvanceAddress=1323
 AirflowSensorAddress=1307
 EngineLoadAddress=1305
 ThrottlePositionAddress=1329
 InjectorPulseWidthAddress=1306
 ISUDutyValveAddress=1314
 O2AverageAddress=1310
 O2MinimumAddress=0
 O2MaximumAddress=0
 KnockCorrectionAddress=1328
 AFCorrectionAddress=133E
 AtmosphericPressureAddress=0
 ManifoldPressureAddress=0
 BoostSolenoidDutyCycleAddress=0

 [null]
 ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
 ;Parameter "Address" values are in HEXadecimal
 ;as displayed in the SelectMonitorDump utility
 ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
 BatteryVoltageAddress=1335
 VehicleSpeedAddress=1336
 EngineSpeedAddress=1338
 CoolantTempAddress=1337
 IgnitionAdvanceAddress=1053
 AirflowSensorAddress=1308
 EngineLoadAddress=1305
 ThrottlePositionAddress=1329
 InjectorPulseWidthAddress=1306
 ISUDutyValveAddress=1307
 O2AverageAddress=1309
 O2MinimumAddress=130A
 O2MaximumAddress=130B
 KnockCorrectionAddress=1054
 AFCorrectionAddress=1055
 AtmosphericPressureAddress=1340
 ManifoldPressureAddress=1342
 BoostSolenoidDutyCycleAddress=1341

 */

// Serial Port (FTD1232) Parameters
const _SerialDev='/dev/ttyUSB0';
const _SerialBaudRate = 1954;
const _SerialParity = "even";
const _SerialBitStop = 1;
const _SerialDataBits = 8;

// Some Usefull Commands
const _ECUStop = new Buffer('12000000','hex');
const _ECUReadNULL = new Buffer ('78000000','hex');
const _ECUReadDummy = new Buffer ('78123400','hex');
const _ECUGetId = new Buffer('00464849','hex');


var _SerialPort = require('serialport');
var _Sleep = require('sleep');
var _Port = null;
var _PortOpen=false;
var _QueryQueue=[];
var _ECUBusy=false;
var _CurrentQuery=null;
var _GetId=false;
var _CurrentTask="";

function _SSMOpen()
{
    _Port.open(function (err) {
        if (err) {
            return console.log('Error opening port: ', err.message);
        }
        console.log('Entering SerialPort Open Callback');
        // write errors will be emitted on the port since there is no callback to write
        _GetId=true;
    });
}

function _SSMClose(){
    _StopECU();
    _Sleep.msleep(10);
    _Port.close();
    _PortOpen=false;
}

function _SSMInit(socket){
    _Port=new _SerialPort(_SerialDev,
        {autoOpen: false, baudRate:_SerialBaudRate, parity: _SerialParity, stopBits:_SerialBitStop,dataBits:_SerialDataBits});

    _Port.on('error',function(err){console.log('Error : %s',err);});

    _Port.on('data', function(data){
        if (data.length!=3) return;
        else {
            console.log(data);
            if (String(data.toString('hex')).substring(0,4)=="0000") return;
            if (_GetId) {
                socket.emit('ROMID',data.toString('hex'));
                socket.emit('ECUCONNECTED');
                _GetId=false;
            }
            if (!_CurrentQuery){
                socket.emit('LOG',_CurrentTask+' finished.');
                _CurrentTask=""
                _StopECU();
                return;
            }
            var ReturnedHexValue = data.toString('hex').substr(4,2);
            var ReturnedDecValue = parseInt(ReturnedHexValue,16);
            var ReturnedAddress = String(data.toString('hex')).substring(0,4);

            socket.emit('DUMPED',ReturnedAddress,ReturnedHexValue);

            _ProcessQueue();
        }
    });

    _Port.on('open',function(){
        _PortOpen=true;
        socket.emit('LOG','Serial Hooked !');
       if (_GetId)
            _GetIdECU();
    });

}

function _SSMDump(FromAddr,ToAddr) {
    console.log('Sending ECU Init & GetId Buffers ...');
    var i=0;

    _CurrentTask="DUMP";
    _StopECU();

    for (var i=FromAddr;i<ToAddr+1;i++) {
        _SSMQuery(i.toString(16));
    }

}

function _SSMBurstDump(FromAddr,ToAddr) {
    console.log('Sending Burst Dumped ...');
    var i=0;
    var stringBuffer="";

    _CurrentTask="DUMP";
    _StopECU();

    for (var i=FromAddr;i<ToAddr+1;i++) {
        stringBuffer='78'+i.toString(16)+'00';
        //+'78'+i.toString(16)+'00'+'78'+i.toString(16)+'00';
        _Port.write(new Buffer(stringBuffer,'hex'));
        _Sleep.msleep(200);
        //_Port.drain();
    }
}

function _SSMQuery(address) // hex string
{
    _QueryQueue.push(address);
    if (_ECUBusy) return;
    _ECUBusy=true;
    _ProcessQueue();
}

function _ProcessQueue()
{
    var next = _QueryQueue.shift();
    _CurrentQuery=next;
    if (!next){
        _ECUBusy=false;
        return;
    }
    _Port.write(new Buffer('78' + next + '00', 'hex'));
}

function _StopECU()
{
    _Port.write(_ECUStop);
    _Port.write(_ECUStop);
}

function _GetIdECU()
{
    _SSMQuery("0000");
    _Sleep.msleep(1);
    _CurrentTask='Get ROM Id';
    _Port.write(_ECUGetId);
}



