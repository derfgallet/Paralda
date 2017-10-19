/**
 * Created by fgallet on 21/04/2017.
 */


module.exports = {
    SSMInit: _SSMInit,
    SSMOpen: _SSMOpen,
    SSMDump: _SSMDump,
    SSMQuery: _SSMQuery,
    SSMClose: _SSMClose,
    StopECU: _StopECU,
    SSMTelemetry: _SSMTelemetry,
    SSMTelemetryStop: _SSMTelemetryStop,
    reEmit:reEmit
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
var SSMTimer= require('timers');
var _Port = null;
var _PortOpen=false;
var _QueryQueue=[];
var _ECUBusy=false;
var _CurrentQuery=null;
var previousQuery=null;
var _CurrentTask="";
var _DumpArray=[];
var _DumpFile="";
var _Socket=null;
var telemetry={};
var buf = new Buffer(0);
var _SSMTdata={};

var SinCounter=0;

function PadHex(str)
{
    var pad = "00";
    return pad.substring(0, pad.length - str.length) + str;
}

function watchDog()
{
    if (_CurrentTask!="")
        if (_CurrentQuery==previousQuery)
            reEmit();
    previousQuery=_CurrentQuery;
}

function _SSMInit(socket,Platform){

    _Socket=socket;

    if (Platform!="Rpi") _SerialPort= require('virtual-serialport');

    //console.log('Platform:'+Platform);

    _Port=new _SerialPort(_SerialDev,
        {autoOpen: true, baudRate:_SerialBaudRate, parity: _SerialParity, stopBits:_SerialBitStop,dataBits:_SerialDataBits});

    _Port.on('error',function(err){console.log(err);});

    _Port.on('open',function(){
        _PortOpen=true;
        socket.emit('LOG','Serial Hooked !');

        // setting a fucking WatchDog
        SSMTimer.setInterval(watchDog,100);

        var out=new Buffer(0);

        _Port.on('data', function(data) {
            console.log('currentQuery' + _CurrentQuery);
            //console.log('data=' + data.toString('hex'));
            console.log('data=' + data);

            // A Améliorer pour bien avoir la reponse dés qu'elle apparait ...
            console.log('=> Creation du buffer out');
            buf = Buffer.concat([buf, data]);
            console.log('Slice du buffer');
            out = buf.slice(0, 3);
            console.log('out=' + out.toString('hex'));

            switch (out.length) {
                case 3:
                    console.log('==> Good Value');
                    if (!_CurrentQuery){
                        socket.emit('LOG',_CurrentTask+' finished.');
                        _CurrentTask=""
                        _StopECU();
                        return;
                    }
                    var ReturnedHexValue = out.toString('hex').substr(4,2);
                    var ReturnedDecValue = parseInt(ReturnedHexValue,16);
                    var ReturnedAddress = String(out.toString('hex')).substring(0,4);

                    if (_DumpFile!="") {
                        _DumpArray.push({Address: ReturnedAddress, Value: ReturnedHexValue});
                        console.log('==> Push to file.')
                    }
                    else
                        if (_CurrentTask=='TELEMETRY')
                        {
                            telemetry[ReturnedAddress]=ReturnedDecValue;
                            console.log('==> Push to telemetry.')
                        }
                        else {
                            console.log('==> Push to Socket.')
                            socket.emit('DUMPED', ReturnedAddress, ReturnedHexValue);
                        }

                    console.log('==> buffer before flush = '+buf.toString('hex'));
                    buf = new Buffer(0);
                    console.log('==> buffer flushed');
                    _ProcessQueue();
                    console.log('==> Processqueue done');
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
                                //var value = Math.floor((Math.random() * 254) + 1);
                                var value = Math.floor(Math.sin(SinCounter)*7000/25);
                                SinCounter ++;
                                if (_Ver=='V0') {
                                    var VSResponse = addr + PadHex(value.toString(16));
                                    _Port.writeToComputer(new Buffer(VSResponse, 'hex'));
                                }
                                else {
                                    var VSResponse = new Buffer(3);
                                    VSResponse[0] = parseInt(addr.substring(0, 2), 16);
                                    VSResponse[1] = parseInt(addr.substring(2, 4), 16);
                                    VSResponse[2] = value;
                                    for (var i = 0; i < VSResponse.length; i++)
                                        _Port.writeToComputer(VSResponse[i]);
                                }
                                console.log('VSResponse size=',VSResponse.length);
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

    buf = new Buffer(0);
    _CurrentTask="DUMP";
    _DumpFile=ToFile;

    _StopECU();
    _QueryQueue=[];
    _DumpArray=[];
    _ECUBusy=false;

    for (var i=FromAddr;i<ToAddr+1;i++)
        _SSMQuery(i.toString(16));


}

function _SSMTelemetry(telemetryConf)
{
    _CurrentTask="TELEMETRY";

    for (var addr in telemetryConf)
    {
        _SSMQuery(telemetryConf[addr]);
        _SSMTdata[addr]=telemetry[telemetryConf[addr]];
     /*   console.log('-= _SSMTelemetry =- addr=',addr);
        console.log('-= _SSMTelemetry =- telemetryConf=',telemetryConf);
        console.log('-= _SSMTelemetry =- telemetryConf[addr]=',telemetryConf[addr]);
        console.log('-= _SSMTelemetry =- telemetry=',telemetry);
        console.log('-= _SSMTelemetry =- telemetry[telemetryConf[addr]]=',telemetry[telemetryConf[addr]]);
        console.log('-= _SSMTelemetry =- data[addr]=',_SSMTdata);*/

    }

   // console.log('-= _SSMTelemetry =- telemetryConf=',telemetryConf);
   // console.log('-= _SSMTelemetry =- telemetry=',telemetry);
   // console.log('-= _SSMTelemetry =- data[addr]=',_SSMTdata);
    return _SSMTdata;
}

function _SSMTelemetryStop()
{
    _QueryQueue=[];
}


function _SSMQuery(address) // hex string
{
    console.log('/// Pushing to Queue = '+address);
    _QueryQueue.push(address);
    if (_ECUBusy || !_PortOpen) return;
    _ECUBusy=true;
    _ProcessQueue();
}
function reEmit()
{
    _Port.write(new Buffer('78' + _CurrentQuery + '00', 'hex'));
}

function _ProcessQueue()
{


    if (_PortOpen)
        {
            var next= _QueryQueue.shift();
            console.log('*** Next Value = '+next);
            _CurrentQuery = next;
        if (!next)
        {
            _ECUBusy=false;
            if (_CurrentTask=="DUMP" || _CurrentTask=="TELEMETRY")
            {
                if (_DumpFile!="") {
                    var jsonfile = require('jsonfile');
                    var file = './app/data/' + _DumpFile + '.json';
                    jsonfile.writeFile(file, _DumpArray, {spaces: 2}, function (err) {
                        console.log(err);
                    });
                    _Socket.emit('LOG',"Dump Finished. Saved to file : "+_DumpFile+".json");
                }
                console.log(_CurrentTask+' finished.');
                _CurrentTask="";
            } else console.log('Queue finished.');

        }
        else {
            console.log('*** Write to ECU = '+next);
            _Port.write(new Buffer('78' + next + '00', 'hex'));
        }

    }
}

function _StopECU()
{
    _Port.write(_ECUStop);
    console.log('Stop Emit !');
}

function _GetIdECU()
{
    _SSMQuery("0000");
    _Sleep.msleep(5);
    _CurrentTask='Get ROM Id';
    _Port.write(_ECUGetId);
}



