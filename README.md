![corgiserver](https://github.com/hou80houzhu/corgiserver/raw/master/conf/pages/corgiserver.png)  [![Build Status](https://travis-ci.org/hou80houzhu/corgiserver.svg?branch=master)](https://travis-ci.org/hou80houzhu/corgiserver)
[![Gitter](https://badges.gitter.im/hou80houzhu/corgiserver.svg)](https://gitter.im/hou80houzhu/corgiserver?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

[![NPM](https://nodei.co/npm/corgiserver.png?downloads=true)](https://nodei.co/npm/corgiserver/)

A web server running javascript like tomcat.

## What is corgiserver

[![Join the chat at https://gitter.im/hou80houzhu/corgiserver](https://badges.gitter.im/hou80houzhu/corgiserver.svg)](https://gitter.im/hou80houzhu/corgiserver?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

corgiserver is a web server running javascript code, supports multiple projects, and ROOT as the default project. It is similar to Java Tomcat server, default resolution `.csp` file, which is a packet (specific wording javascript files) container.corgiserver is a nodejs module container.

> Please refer to packet [BrightJS doc](http://brightjs.org "BrightJS")

## Quick Start

**step 1**: install corgiserver

`npm install corgiserver -g`

**step 2**:

`$ corgiserver create <projectname>,<projectpath>`

the command will create the folder of project and its files.

**step 3**:

goto the project folder to build the controllers.

**step 4**

run the server `$ corgiserver -start`


## Project directory structure

```
project
   ├─node_modules (forbidden) => $ npm install <module> --save
   ├─WEBINF (forbidden)
   │    ├─src
   │    │  └─<code>
   │    └─web.json
   ├─<assets>
   ├─...
   ├─index.html
   └─package.json
```

- **WEBINF** Is the project of a protected directory can not be accessed outside
- **WEBINF/src** is a packet drop directory (similar to java package management system)
- **WEBINF/web.json** is the profile of the project
- **WEBINF** directory can be placed outside other static resources
- **node_modules** the third part module folder installed by npm command.

> Third-party modules can co-exist with the project, the project can not references to each other between the third-party modules.Of course, you can use a global third-party modules.

> rquire Third-party modules in the project code just like `require("/<moduleName>");`,`"/"` is important.

## Operating Mechanism

Would start separately configured service project when a project starts, all the services are started after the project start is completed. After the completion of the project started, the request will come one by one through the filter chain processing, and then return.

>Use the built-in framework to define mvcservice and mvcfilter in web.json file project

## web.json

- **Page** for covered server default page
- **upload** set encoding,max form size,tmp folder
- **Service** is used to configure the service to start with the project
- **Filter** is used to configure a request through a filter

### corgi provides predefined service

- mvcservice for implementing initialization mvc functions     
  - **database** database configuration 
     - **host** database IP 
     - **port** database port 
     - **debug** debug mode is turned on 
     - **database** database name 
     - **user** database user name 
     - **password** database password 
     - **connectionLimit** the maximum number of connections
  - **view**
     - **path** template path 
     - **suffix** suffix template

 
### corgi provided predefined filter
- mvcfilter function for implementing mvc
- cachefilter for implementing the browser cache function files - etag: true open etag - cacheSetting: {default: 200000} cache Last-modified time is used to control the Cache-control
- zipfilter for implementing the response with gzip compression - gzip: "js, css" what file extension provisions gzip compression - deflate: "png" file suffix provisions which deflate compression

## server config

server config under the `conf/server.json` file control

- **Port** server port, default 8080
- **Modules** server load module defaults to `lib/modules/base.js`
- **ipc** set process comunication option
  - **socketPath** ipc socketpath
  - **port** ipc port
  - **host** ipc host
- **log** set server log file path
  - **server** server log path
  - **daemon** daemon process log path 

> Custom modules arranged in this order basis having


## web config

web config under the `conf/web.json` file control

- **Session**
   - Timeout session timeout (in milliseconds)
- **CspCache** csp page caching is turned on, if you turn the page is loaded once
- **Page** default server configuration page
- **Mime** mime type configuration

## Custom server module

Server modules need to be placed under `lib / modules /` directory and each Module to determine a good inheritance.

### Custom module global object

**project object**

- `isOuterProject()` whether the project as external project (project initiated by the configuration file, instead of in webapps run as folders)
- `getPacketPath()` packet directory project
- `getProjectPath()` project directory
Configuration information object 
- `getProjectConfig()` project
- `getProjectName()` Project Name Whether there are key attributes hasAttr (key) projects the global cache
- `getAttr(key)` Gets the value of key projects from the global cache
- `setAttr(key, value)` to set key-value cache to the global project


**packetLoader object**

- `get(name, option)` Get packet instance
- `has(name)` to determine whether packet contains definitions
- `each(fn)` through all packet definitions

**CorgiServer**

- `getServiceConfig()` Gets the object serverConfig
- `getWebConfig()` Gets Global web Config Object
- `getCspContent(path)` Gets csp file contents
- `setTemplateMacro(key, fn)` set a custom label templates globally

**serverConfig**

- `getHost()`
- `getPort()`
- `getModules()`
- `getBasePath()`
- `getConfigPath()`

**webConfig**

- `getSessionConfig()`
- `getSessionTimeout()`
- `getPagePath()`
- `getMimeType()`
- `getBasePath()`
- `getConfigPath()`
- `isCspCache()`

**projectConfig**

- `getService()`
- `getFilter()`
- `hasFilter()`
- `hasService()`
- `getPagePath()`
- `hasPage()`
- `getServiceSize()`
- `getFilterSize()`

## See the demos in webapps

webapps/ROOT default project

webapps/todo how to use mysql with corgi

webapps/test how to use controller and so on

webapps/doc how to write controller and custom corgi

## See the blog demo

Sample blog corgiblog->[github](https://github.com/hou80houzhu/corgiblog "github")

**Execute the command and then run the blog**

```
$ corgiserver install <projectName> <localFolder> https://github.com/hou80houzhu/corgiblog/archive/master.zip
```
> this command will download the zip file,and build it,then you can run it with corgiserver.
> with this command you can update your site too.

## Run corgiserver

start without daemon process

```
$ corgiserver -run
```
start without corgiserver daemon process,but you can also daemon it by `nohup` in linux,or use forever.js.

```
$ nohup corgiserver -run &
```
start corgiserver with corgiserver daemon

```
$ corgiserver -start
```

## corgiserver useage

```
Useage:
   version               show version
   run                   just start without deamon process
   ?                     help
   help                  help
   restart               restart server
   start                 start server
   stop                  close all corgiserver service
   status                show the server running status.
   create:<projectName>,<projectPath>
                          create project with a projectName and its local file path
   daemonpid             show the daemon process id
   remove:<projectName>
                          remove porject with projectName
   ls                    list all the projects
   sport:<port>
                          set current port of corgiserver
   ssessiontimeout:<time>
                          set current session timeout of corgiserver
   info                  show corgiserver info
   encache               enable to cache csp
   discache              disable to cache csp
   remoteprojects        list all remote projects
   install:<projectName>,<localFolder>,<zipPath>
                          install a website form a zip file
   update:[<projectName>]
                          update all projects which has a romote path.
   updateremotepath:<projectName>,<zipPath>
                          update a project remote path.
```


## changelog

- **version 0.2.0**
  - http comet support
  - remove mvcservice database option
  - add daoservice
  - add chat sample
  - not support < 0.1 version
- **version 0.1.13**
  - beauty the CLI console
- **version 0.1.12**
  - remove colog
  - fix CLI -update
- **version 0.1.10**
  - clean projects
- **version 0.1.9**
  - fix bugs
- **version 0.1.8**
  - fix bugs
- **version 0.1.7**
  - remove kill command
- **version 0.1.6**
  - fix bugs
- **version 0.1.3**
  - add sinlestart command
  - fix bugs
- **version 0.1.0**
  - add daemon process(ipc refer to [node-easy-ipc](https://github.com/oleics/node-easy-ipc "node-easy-ipc")) 
  - add log management
  - add some commands
  - add color console
  - remove s,r,v,h command
- **version 0.0.21**
  - unified promise
  - add update project command
  - add edit project remote project command
- **version 0.0.20**
  - server automatically restart when downtime,In rare cases.
  - upload files support
- **version 0.0.19**
  - add redirectView,customView
  - unified version code

## License

Copyright (c) 2016-2017 WangJinliang

[MIT License](https://github.com/hou80houzhu/corgiserver/blob/master/LICENSE "MIT License")
