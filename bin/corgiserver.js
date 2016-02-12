#!/usr/bin/env node  
var server = require("../lib/server");
var run = function (obj) {
    if (obj[0] === 'version') {
        console.log('version is 0.0.1');
    } else if (obj[0] === '-h') {
        console.log('Useage:');
        console.log('  version --version [show version]');
        console.log('  start --start [start server]');
        console.log('  create [name] [path] --create [create project]');
    } else if (obj[0] === "start") {
        server.run();
    } else if (obj[0] === "create") {
        if (obj[1] && obj[2]) {
            server.create(obj[1], obj[2]);
        } else {
            console.log("parameter error.first parameter is project name,the other is project path");
        }
    } else {
        console.log('Useage:');
        console.log('  version --version [show version]');
        console.log('  start --start [start server]');
        console.log('  create [name] [path] --create [create project]');
    }
};
run(process.argv.slice(2));