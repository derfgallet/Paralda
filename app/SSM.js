/**
 * Created by fgallet on 21/04/2017.
 */


module.exports = {
    SSMInit: _SSMInit,
    SSMDump: _SSMDump,
    SSMQuery: _SSMQuery,
    SSMClose: _SSMClose
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

var _ECUSimulator=true;
var _socket=null;

// Serial Port (FTD1232) Parameters
const _SerialDev='/dev/ttyUSB0';
const _SerialBaudRate = 1953;
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

function _SSMInit(socket,Simulator){
    _socket=socket;
    _ECUSimulator=Simulator;
    if(!_ECUSimulator) {
        _Port = new _SerialPort(_SerialDev,
            {
                autoOpen: true,
                baudRate: _SerialBaudRate,
                parity: _SerialParity,
                stopBits: _SerialBitStop,
                dataBits: _SerialDataBits
            });

        _Port.on('error', function (err) {
            console.log('Error : %s', err);
        });

        _Port.on('data', function (data) {
            if (data.length != 3) return;
            else {
                if (_GetId) {
                    _socket.emit('ROMID', data.toString(16));
                    _GetId = false;
                }
                if (!_CurrentQuery) {
                    _socket.emit('LOG', _CurrentTask + ' finihed.');
                    _CurrentTask = ""
                    _StopECU();
                    return;
                }
                var ReturnedHexValue = data.toString('hex').substr(4, 2);
                var ReturnedDecValue = parseInt(ReturnedHexValue, 16);
                var ReturnedAddress = String(data.toString('hex')).substring(0, 4);

                _socket.emit('DUMPED', ReturnedAddress, ReturnedHexValue);

                _ProcessQueue();
            }
        });

        _Port.on('open', function () {
            _PortOpen = true;
            _socket.emit('LOG', 'Serial Hooked !');
        });
    }
    else
    {

    }
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

function _SSMQuery(address) // hex string
{
    if (!_ECUSimulator) {
        _QueryQueue.push(address);
        if (_ECUBusy) return;
        _ECUBusy = true;
        _ProcessQueue();
    } else {
        _socket.emit('DUMPED', address, randomByte());
    }
}

function _SSMClose(){
    _StopECU();
    if (!_ECUSimulator) _Port.close();
    _PortOpen=false;
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
    if (!_ECUSimulator) {
        _Port.write(_ECUStop);
        _Port.write(_ECUStop);
    }
}


function GetIdECU()
{
    if (!_ECUSimulator) {
        _SSMQuery("0000");
        _Port.write(_ECUGetId);
    }
}

function randomByte (low, high) {
    return Math.floor(Math.random() * 256);
}


