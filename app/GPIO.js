/**
 * Created by fgallet on 16/04/2017.
 */

module.exports = {
    GPIOInit : _GPIOInit,
    StopEngine : _StopEngine,
    EnableEngine : _EnableEngine,
    StartIgnition : _StartIgnition,
    StopIgnition : _StopIgnition
};

var rpio = null;
// Engine Relay on GPIO 23 -> Pin 16
var _EngineGPIOPin=16;
var _Relay2Pin=18;
var _Relay3Pin=22;
var _Relay4Pin=32;
var _Platform="";

function _GPIOInit(Platform)
{

    _Platform=Platform;
    if (_Platform=="Rpi") {
        rpio = require('rpio');
        rpio.open(_EngineGPIOPin, rpio.OUTPUT, rpio.HIGH);
        rpio.open(_Relay2Pin, rpio.OUTPUT, rpio.HIGH);
        rpio.open(_Relay3Pin, rpio.OUTPUT, rpio.HIGH);
        rpio.open(_Relay4Pin, rpio.OUTPUT, rpio.HIGH);
    }
}

function _StopEngine()
{
    if (_Platform=="Rpi") rpio.write(_EngineGPIOPin,rpio.LOW);
}

function _EnableEngine()
{
    if (_Platform=="Rpi") rpio.write(_EngineGPIOPin,rpio.HIGH);
}

function _StopIgnition() {
    if (_Platform=="Rpi") rpio.write(_Relay2Pin,rpio.HIGH);
}

function _StartIgnition()
{
    if (_Platform=="Rpi") rpio.write(_Relay2Pin,rpio.LOW);
}