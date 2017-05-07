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

const SerialDev='/dev/ttyUSB0';
const SerialBaudRate = 1953;
const SerialParity = "even";
const SerialBitStop = 1;
const SerialDataBits = 8;

 
const ECUStop = new Buffer('12000000','hex');
const ECUReadNULL = new Buffer ('78000000','hex');
const ECUReadDummy = new Buffer ('78123400','hex');
const ECUGetId = new Buffer('00464849','hex');
const ECUReadDataBegin = new Buffer('78','hex');
const ECUReadDataEnd = new Buffer('00','hex');
const ECUWriteDataBegin = new Buffer('AA','hex');
const ECUtest = new Buffer('7F313241423030','hex');


var SerialPort = require('serialport');

var Sleep = require('sleep');

var Port = new SerialPort(SerialDev,
    {autoOpen: true, baudRate:SerialBaudRate, parity: SerialParity, stopBits:SerialBitStop,dataBits:SerialDataBits,
    parser:SerialPort.parsers.byteLength(3)});

Port.on('error',function(err){console.log('Error : %s',err);});

Port.on('data', function(data){
    console.log('Received data : ' + data.toString('hex'));Port.write(ECUStop);
    }
    );

Port.on('open',function(){console.log('Serial Hooked !');test();});

function test() {        Port.write(ECUStop);
        console.log('Sending ECU Init & GetId Buffers ...');
        Port.write(ECUStop);
        Port.write(ECUReadNULL);
        Port.write(ECUStop);
        //Port.write(ECUGetId);
        //Sleep.usleep(10);
        //Port.write(ECUStop);
/*      console.log('Done ... praying ...');*/
}

