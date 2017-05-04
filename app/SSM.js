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
// 45	msb	lsb	00	Read data from TCU address
// 89	00	lsb		Read data from AirCon address
// 92	00	lsb		Read data from 4WS address
// AA	msb	lsb	data	Write data to address
// AB	00	lsb		Read data from Cruise address
// 00	46	48	49	Get ROM ID

const SerialDev='/dev/serial0'; // Rpi Internal UART after disabling BT => /boot/config.txt = btoverlay=pi3-disable-bt
const SerialBaudRate = 1953;
const SerialParity = "even";
const SerialBitStop = 1;
const SerialDataBits = 8;


const ECUInit = new Buffer('12000000','hex');
const ECUGetId = new Buffer('0046489','hex');
const ECUReadDataBegin = new Buffer('78','hex');
const ECUReadDataEnd = new Buffer('00','hex');
const ECUWriteDataBegin = new Buffer('AA','hex');

// Former Test
//const HiECU = new Buffer('8010f001bf40','hex');
//const MemDumpECU = new Buffer('8010f006a0002000007fc5','hex');
//const readNull = new Buffer('78000000','hex');
//const GetId = new Buffer('00387ffe','hex');


var Serial = require('serialport');
var Sleep = require('sleep');

var SerialPort = new Serial(SerialDev,{autoOpen: true, baudRate:SerialBaudRate, parity: SerialParity, stopBits:SerialBitStop,dataBits:SerialDataBits});

SerialPort.on('error',function(err){console.log('Error : %s',err);});

SerialPort.on('data', function(data){console.log('Received data : ' + data);});

SerialPort.on('open',function(){console.log('Serial Hooked !');test();});

function test() {
        Console.log('Sending ECU Init Buffer ...');
        SerialPort.write(ECUInit);
        Console.log('Sent. Waiting for a while ...');
        Sleep.usleep(500);
        Console.log('Sending ECU Get Id Buffer ...');
        SerialPort.write(ECUGetId);
}

