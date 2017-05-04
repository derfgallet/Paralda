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

function _GPIOInit()
{
    rpio.open(_EngineGPIOPin,rpio.OUTPUT,rpio.HIGH);
}

function _StopEngine()
{
    rpio.write(_EngineGPIOPin,rpio.HIGH);
}

function _EnableEngine()
{
    rpio.write(_EngineGPIOPin,rpio.LOW);
}