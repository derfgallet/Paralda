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

// Serial Port (FTD1232) Parameters
var _SerialDev='/dev/ttyUSB0';
const _SerialBaudRate = 1954;
const _SerialParity = "even";
const _SerialBitStop = 1;
const _SerialDataBits = 8;

// Some Usefull Commands
const _ECUStop = new Buffer('12000000','hex');
const _ECUGetId = new Buffer('00464849','hex');


var _SerialPort = require('serialport');
var _Sleep = require('sleep');
var _Port = null;
var _PortOpen=false;
var _QueryQueue=[];
var _ECUBusy=false;
var _CurrentQuery=null;
var _CurrentTask="";
var _DumpArray=[];
var _DumpFile="";

function PadHex(str)
{
    var pad = "00";
    return pad.substring(0, pad.length - str.length) + str;
}

function _SSMInit(socket,Platform){

    if (Platform!="Rpi") _SerialPort= require('Virtual-serialport');

    _Port=new _SerialPort(_SerialDev,
        {autoOpen: true, baudRate:_SerialBaudRate, parity: _SerialParity, stopBits:_SerialBitStop,dataBits:_SerialDataBits});

    _Port.on('error',function(err){console.log(err);});

    _Port.on('open',function(){
        _PortOpen=true;
        socket.emit('LOG','Serial Hooked !');
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
                        return;
                    }
                    var ReturnedHexValue = data.toString('hex').substr(4,2);
                    var ReturnedDecValue = parseInt(ReturnedHexValue,16);
                    var ReturnedAddress = String(data.toString('hex')).substring(0,4);
                    socket.emit('DUMPED',ReturnedAddress,ReturnedHexValue);
                    _DumpArray.push({Address:ReturnedAddress,Value:ReturnedHexValue});
                    _ProcessQueue();
                    break;
                default:
                    return;
            }
        });
        if (Platform!="Rpi") {
            _Port.on("dataToDevice", function (data) {
                switch (data.length) {
                    case 4:
                        var cmd=data.toString('hex').substring(0,2);
                        var addr=data.toString('hex').substring(2,6);
                        var filler = data.toString('hex').substring(6,8);
                        switch (cmd){
                            case "78" :
                                var value = Math.floor((Math.random() * 254) + 1);
                                var VSResponse=addr+PadHex(value.toString(16));
                                _Port.writeToComputer(new Buffer(VSResponse, 'hex'));
                                break;
                            default:
                                return;
                        }
                        break;
                    default:
                        console.log('data length default');
                        return;
                }
            });
        }
    });

}

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

function _SSMDump(FromAddr,ToAddr,ToFile) {
    console.log('Sending ECU Init & GetId Buffers ...');
    var i=0;

    _CurrentTask="DUMP";
    if (ToFile=="")
        _DumpFile="Dump";
    else
        _DumpFile=ToFile;

    _StopECU();

    _DumpArray=[];

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
    if (_PortOpen)
        {
        var next=_CurrentQuery = _QueryQueue.shift();

        if (!next)
        {
            _ECUBusy=false;

            if (_CurrentTask=="DUMP")
            {
                var jsonfile = require('jsonfile');
                var file = './app/data/'+_DumpFile+'.json';
                jsonfile.writeFile(file, _DumpArray,{spaces: 2},function(err){console.log(err);});
                console.log('DUMP finished.');
            } else console.log('Queue finished.');

        }
        else _Port.write(new Buffer('78' + next + '00', 'hex'));
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



