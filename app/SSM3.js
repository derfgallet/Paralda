/**
 * Created by fgallet on 21/04/2017.
 */


module.exports = {
    SSMInit: _SSMInit,
    SSMOpen: _SSMOpen,
    SSMDump: _SSMDump,
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
var _ReceivedBuffer=[];

function _SSMOpen()
{
    _Port.open();
}

function _SSMClose(){
    _StopECU();
    _Sleep.msleep(10);
    _Port.close();
    _PortOpen=false;
}

function _SSMInit(socket){
    _Port=new _SerialPort(_SerialDev,
        {autoOpen: true, baudRate:_SerialBaudRate, parity: _SerialParity, stopBits:_SerialBitStop,dataBits:_SerialDataBits});

    _Port.on('error',function(err){console.log(err);});

    _Port.on('data', function(data) {

        switch (data.length) {
            case 1:
                break;
            case 2:
                break;
            case 3:
                if (!_CurrentQuery){
                    socket.emit('LOG',_CurrentTask+' finished.');
                    _CurrentTask=""
                    _StopECU();
                    //SendReceivedBuffer(_ReceivedBuffer,socket);
                    return;
                }
                var ReturnedHexValue = data.toString('hex').substr(4,2);
                var ReturnedDecValue = parseInt(ReturnedHexValue,16);
                var ReturnedAddress = String(data.toString('hex')).substring(0,4);
                socket.emit('DUMPED',ReturnedAddress,ReturnedDecValue);
                _ReceivedBuffer.push(data);
                _ProcessQueue();
                break;
            default:
                return;
        }
    });

    _Port.on('open',function(){
        _PortOpen=true;
        socket.emit('LOG','Serial Hooked !');
    });

}

function SendReceivedBuffer(buf,socket)
{
    for (var i=0; i<buf.length;i++)
    {


        socket.emit('DUMPED',ReturnedAddress,ReturnedHexValue);
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
    _QueryQueue.push(address);
    if (_ECUBusy || !_PortOpen) return;
    _ECUBusy=true;
    _ProcessQueue();
}

function _ProcessQueue()
{
    console.log('ProcessQueue _PortOpen:'+_PortOpen);
    if (_PortOpen)
        {
        var next=_CurrentQuery = _QueryQueue.shift();

        if (!next)
        {
            _ECUBusy=false;
            console.log('Queue finished.');
        }
        else
        {

               console.log('Writing to Port : '+next);
               _Port.write(new Buffer('78' + next + '02', 'hex'));
        }
    }
}

function _StopECU()
{
    _Port.write(_ECUStop);
    _Port.write(_ECUStop);
}

function _GetIdECU()
{
    _SSMQuery("0000");
    _Sleep.msleep(5);
    _CurrentTask='Get ROM Id';
    _Port.write(_ECUGetId);
}



