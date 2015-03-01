// changed from pi-gpio
"use strict";

var fs = require("fs");
var	path = require("path");

var sysFsPath = "/sys/devices/virtual/gpio";
var sysGpioPath = "/sys/class/gpio";

function isNumber(number) {
	return !isNaN(parseInt(number, 10));
}

function noop(){}

function handleExecResponse(method, pinNumber, callback) {
	return function(err, stdout, stderr) {
		if(err) {
			console.error("Error when trying to", method, "pin", pinNumber);
			console.error(stderr);
			callback(err);
		} else {
			callback();
		}
	}
}

function sanitizePinNumber(pinNumber) {
	if(!isNumber(pinNumber) || parseInt(pinNumber, 10) > 125)) {//
		throw new Error("Pin number isn't valid");
	}

	return parseInt(pinNumber, 10);
}

function sanitizeDirection(direction) {
	direction = (direction || "").toLowerCase().trim();
	if(direction === "in" || direction === "input") {
		return "in";
	} else if(direction === "out" || direction === "output" || !direction) {
		return "out";
	} else {
		throw new Error("Direction must be 'input' or 'output'");
	}
}

function sanitizeOptions(options) {
	var sanitized = {};

	options.split(" ").forEach(function(token) {
		if(token == "in" || token == "input") {
			sanitized.direction = "in";
		}else if (token == "out" || token == "output"){
            sanitized.direction = "out";
        }
	});

	if(!sanitized.direction) {
		sanitized.direction = "out";
	}

	return sanitized;
}

var gpio = {
	
	open: function(pinNumber, options, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		if(!callback && typeof options === "function") {
			callback = options;
			options = "out";
		}

		options = sanitizeOptions(options);
        var value = pinNumber.toString();
        fs.writeFile(sysGpioPath + "/export", value, function(err){
            if(err) return (callback || noop)(err);
            gpio.setDirection(pinNumber, options.direction, callback);
        });
	},

	setDirection: function(pinNumber, direction, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		direction = sanitizeDirection(direction);

		fs.writeFile(sysFsPath + "/gpio" + pinNumber + "/direction", direction, (callback || noop));
	},

	getDirection: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);
		callback = callback || noop;

		fs.readFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/direction", "utf8", function(err, direction) {
			if(err) return callback(err);
			callback(null, sanitizeDirection(direction.trim()));
		});
	},

	close: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

        fs.writeFile(sysGpioPath + "/unexport", pinNumber, callback || noop);
	},

	read: function(pinNumber, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		fs.readFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", function(err, data) {
			if(err) return (callback || noop)(err);

			(callback || noop)(null, parseInt(data, 10));
		});
	},

	write: function(pinNumber, value, callback) {
		pinNumber = sanitizePinNumber(pinNumber);

		value = !!value?"1":"0";

		fs.writeFile(sysFsPath + "/gpio" + pinMapping[pinNumber] + "/value", value, "utf8", callback);
	}
};

gpio.export = gpio.open;
gpio.unexport = gpio.close;

module.exports = gpio;
