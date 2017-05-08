/**
 * Created by fgallet on 21/04/2017.
 */


module.exports = {

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
const SerialDev='/dev/ttyUSB0';
//const SerialDev='/dev/ttyS0';
const SerialBaudRate = 1953;
const SerialParity = "even";
const SerialBitStop = 1;
const SerialDataBits = 8;

const ECUStop = new Buffer('12000000','hex');
const ECUReadNULL = new Buffer ('78000000','hex');
const ECUReadBattery = new Buffer('78133500','hex');
const ECUReadDummy = new Buffer ('78123400','hex');
const ECUGetId = new Buffer('00464849','hex');


var _QueryQueue=[];
var _ECUBusy=false;
var _CurrentQuery=null;


var SerialPort = require('serialport');

var Sleep = require('sleep');

var Port = new SerialPort(SerialDev,
{autoOpen: true, baudRate:SerialBaudRate, parity: SerialParity, stopBits:SerialBitStop,dataBits:SerialDataBits});


Port.on('error',function(err){console.log('Error : %s',err);});

Port.on('data', function(data){
    if (data.length!=3) return;
    else {
        if (data[0]==0x73)
        {
            console.log('RomId : %s',data.toString('hex'));
        }
        if (!_CurrentQuery) return;
        var ReturnedHexValue = data.toString('hex').substr(4,2);
        var ReturnedDecValue = parseInt(ReturnedHexValue,16);
        var ReturnedAddress = String(data.toString('hex')).substring(0,4);
        var Voltage = ReturnedDecValue * 0.08;

        //console.log('Raw : %s .Address 0x%s value : 0x%s / %d => Voltage=%d',
        //    data.toString('hex')
        //    ,ReturnedAddress,ReturnedHexValue,ReturnedDecValue,Voltage);

        console.log('%s|%s',ReturnedAddress,ReturnedDecValue);
        if (ReturnedAddress=="134f") {StopECU();process.exit(0);}
        ProcessQueue();
    }
});

Port.on('open',function(){console.log('Serial Hooked !');test();});

function ProcessQueue()
{
    var next = _QueryQueue.shift();
    if (!next){
        _ECUBusy=false;
        return;
    }
    _CurrentQuery=next;
    Port.write(new Buffer('78' + next + '00', 'hex'));
}

function StopECU()
{
    Port.write(ECUStop);
    Port.write(ECUStop);
}

function QueryECU(address) // hex string
{
    if (address.length == 1) address = '000' + address;
    if (address.length == 2) address = '00' + address;
    if (address.length == 3) address = '0' + address;

    _QueryQueue.push(address);
    if (_ECUBusy) return;
    _ECUBusy=true;
    ProcessQueue();
}

function GetIdECU()
{
    QueryECU("0000");
    Port.write(new Buffer('00474849','hex'))
}

function test() {
        console.log('Sending ECU Init & GetId Buffers ...');
        var i=0;

        StopECU();
        //GetIdECU();


        for (i=0x1300;i<0x1350;i++) {
            QueryECU(i.toString(16));
        }

/*        Port.write(ECUnew Buffer('12000000','hex')ReadNULL);ReadyForNext=false;
        while (!ReadyForNext);
        Port.write(ECUGetId);
        ReadyForNext=false;
        while (!ReadyForNext);
        Port.write(ECUReadBattery);
    //Port.write(ECUStop);
        //Port.write(ECUGetId);
        //Sleep.usleep(10);
        //Port.write(ECUStop);
      console.log('Done ... praying ...');*///
}

