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
const ECUReadDummy = new Buffer ('78123400','hex');
const ECUGetId = new Buffer('00464849','hex');

var SerialPort = require('serialport');

var Sleep = require('sleep');

var Port = new SerialPort(SerialDev,
    {autoOpen: true, baudRate:SerialBaudRate, parity: SerialParity, stopBits:SerialBitStop,dataBits:SerialDataBits,
    parser:SerialPort.parsers.byteLength(3)});

Port.on('error',function(err){console.log('Error : %s',err);});

Port.on('data', function(data){
    console.log('Received data : ' + data.toString('hex'));
    }
    );

Port.on('open',function(){console.log('Serial Hooked !');test();});

function test() {        Port.write(ECUStop);
        console.log('Sending ECU Init & GetId Buffers ...');
        Port.write(ECUStop);
        Port.write(ECUReadNULL);
        //Port.write(ECUStop);
        //Port.write(ECUGetId);
        //Sleep.usleep(10);
        //Port.write(ECUStop);
/*      console.log('Done ... praying ...');*/
}

