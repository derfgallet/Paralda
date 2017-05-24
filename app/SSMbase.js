// Serial Port (FTD1232) Parameters
const _SerialDev='/dev/ttyUSB0';
const _SerialBaudRate = 1954;
const _SerialParity = "even";
const _SerialBitStop = 1;
const _SerialDataBits = 8;

var _SerialPort = require('serialport');
var _Port = null;
var _PortOpen=false;
var _QueryList=["1330","1331","1332","1333","1334","1335","1336","1337","1338","1339","133a","133b","133c","133d","133e","133f"];
var i=1;

function _SSMInit(){
    _Port=new _SerialPort(_SerialDev,
        {autoOpen: true, baudRate:_SerialBaudRate, parity: _SerialParity, stopBits:_SerialBitStop,dataBits:_SerialDataBits});

    _Port.on('error',function(err){console.log('Error : %s',err);});

    _Port.on('data', function(data) {

        switch (data.length) {
            case 1:
                break;
            case 2:
                break;
            case 3:
                _SSMWrite(_QueryList[i++]);
                if (i==16) i=0;
                console.timeEnd("latence");
                console.log(data);
                console.time("latence");
                break;
            default:
                return;
        }
    });

    _Port.on('open',function(){
        _PortOpen=true;
        _SSMWrite(_QueryList[0]);
    });

}

function _SSMWrite(address)
{
    _Port.write(new Buffer('78' + address + '00', 'hex'));
}

function _StopECU()
{
    _Port.write(_ECUStop);
    _Port.write(_ECUStop);
}

_SSMInit();




