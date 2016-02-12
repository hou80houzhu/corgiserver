![corgiserver](https://github.com/hou80houzhu/corgiserver/raw/master/conf/pages/corgiserver.png) [![Build Status](https://travis-ci.org/hou80houzhu/corgiserver.svg?branch=master)](https://travis-ci.org/hou80houzhu/corgiserver)
[![npm version](https://badge.fury.io/js/corgiserver.svg)](https://badge.fury.io/js/corgiserver)

###A web server running javascript like tomcat.

##What is corgiserver

corgiserver是一个运行javascript代码的web服务器，支持多项目，并以ROOT作为默认项目。它类似于Java的Tomcat服务器，默认解析`.csp`文件，它是一个packet（特定写法的javascript文件）容器。

> pakcet请参考[brooderjs packet 说明](http://rocui.com "brooderjs")

## How to use simply

**step 1**: install corgiserver

`npm install corgiserver -g`

**step 2**:

`corgiserver create projectname projectpath`

the command will create the folder of project and its files.

**step 3**:

goto the project folder to build the controllers.


##项目目录结构

```
    project
       --WEBINF
         --src
           --code
         --web.json
       --index.html
```

- WEBINF是项目保护目录，外部无法对其进行访问
- WEBINF/src是packet放置目录（类似java包管理机制）
- WEBINF/web.json是项目的配置文件
- WEBINF以外目录可放置其他静态资源

## web.json

- **page** 用于覆盖服务器默认的页面
- **service** 用于配置随项目启动的服务
- **filter** 用于配置一次请求经过的过滤器

###corgi提供的预定义的service

- mvcservice 用于实现mvc功能的初始化工作
  - database 数据库配置
     - host 数据库IP
     - port 数据库端口
     - debug 是否开启debug模式
     - database 数据库名称
     - user 数据库用户名
     - password 数据库密码
     - connectionLimit 最大连接数
  - view
     - path 模板路径
     - suffix 模板后缀

###corgi提供的预定义filter

- mvcfilter 用于实现mvc功能
- cachefilter 用于实现文件的浏览器缓存功能
  - etag:true开启etag
  - cacheSetting:{default:200000} 缓存时间用于控制Last-modified与Cache-control
- zipfilter 用于实现response的gzip压缩功能
  - gzip:"js,css"规定何种后缀文件进行gzip压缩
  - deflate:"png"规定何种后缀文件进行deflate压缩

## server config

server config由conf/server.json控制

- **host** 服务器IP
- **port** 服务器端口，默认为8080
- **modules** 服务器加载的模块，默认为`lib/modules/base.js`

> 自定义的模块需按顺序配置


## web config

web config由conf/web.json控制

- **session**
  - timeout session超时时间（毫秒）
- **cspCache** 是否开启csp页面缓存，如果开启则页面只加载一次
- **page** 服务器默认页面配置
- **mime** mime类型配置

##自定义服务器模块

服务器模块需要放置于`lib/modules/`目录下

###自定义模块中的全局对象

**project对象**

project对象代表一个项目，其方法如下：

- isOuterProject() 项目是否为外部项目（通过配置文件启动的项目，而不是在webapps下以文件夹形式运行）
- getPacketPath() 项目packet的目录
- getProjectPath() 项目目录
- getProjectConfig() 项目的配置信息对象
- getProjectName() 项目名称
- hasAttr(key) 项目全局缓存中是否存在key属性
- getAttr(key) 从项目全局缓存中获取key值
- setAttr(key,value) 向项目全局缓存设置key-value


**packetLoader对象**

- get(name,option) 获取packet实例
- has(name) 判断是否包含packet定义
- each(fn) 遍历所有的packet定义


