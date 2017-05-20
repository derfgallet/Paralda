/**
 * Created by fgallet on 16/04/2017.
 */

module.exports = {
    GPIOInit : _GPIOInit,
    StopEngine : _StopEngine,
    EnableEngine : _EnableEngine
};

var rpio = require('rpio');
// Engine Relay on GPIO 23 -> Pin 16
var _EngineGPIOPin=16;
var _Relay2Pin=18;
var _Relay3Pin=22;
var _Relay4Pin=32;

function _GPIOInit()
{
    rpio.open(_EngineGPIOPin,rpio.OUTPUT,rpio.HIGH);
    rpio.open(_Relay2Pin,rpio.OUTPUT,rpio.HIGH);
    rpio.open(_Relay3Pin,rpio.OUTPUT,rpio.HIGH);
    rpio.open(_Relay4Pin,rpio.OUTPUT,rpio.HIGH);
}

function _StopEngine()
{
    rpio.write(_EngineGPIOPin,rpio.LOW);
}

function _EnableEngine()
{
    rpio.write(_EngineGPIOPin,rpio.HIGH);
}