#!/usr/bin/env node  
var run = function (obj) {
    if (obj[0] === '-version') {
        console.log('version is 0.0.1');
    } else if (obj[0] === '-h') {
        console.log('Useage:');
        console.log('  -version --version [show version]');
        console.log('  -start --start [start server]');
    } else if (obj[0] === "-start") {
        require("../lib/server").run();
    } else {
        console.log('Useage:');
        console.log('  -version --version [show version]');
        console.log('  -start --start [start server]');
    }
};
run(process.argv.slice(2));