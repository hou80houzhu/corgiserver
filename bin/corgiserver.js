#!/usr/bin/env node  
var server = require("../lib/server");
var run = function (obj) {
    if (obj[0] === 'version') {
        console.log('version is 0.0.4');
    } else if (obj[0] === 'help') {
        console.log('Useage:');
        console.log('  version --version [show version]');
        console.log('  start --start [start server]');
        console.log('  help --help [help]');
        console.log('  create [porjectName] [path] --create [create project]');
        console.log('  stop  --stop [stop server]');
        console.log('  restart  --restart [restart server]');
    } else if (obj[0] === "start") {
        server.run();
    } else if (obj[0] === "create") {
        if (obj[1] && obj[2]) {
            server.create(obj[1], obj[2]);
        } else {
            console.log("parameter error.first parameter is project name,the other is project path");
        }
    } else if (obj[0] === "stop") {
        server.stop();
    } else if (obj[0] === "restart") {
        server.restart();
    } else {
        console.log('Useage:');
        console.log('  version --version [show version]');
        console.log('  start --start [start server]');
        console.log('  help --help [help]');
        console.log('  create [porjectName] [path] --create [create project]');
        console.log('  stop  --stop [stop server]');
        console.log('  restart  --restart [restart server]');
    }
};
run(process.argv.slice(2));