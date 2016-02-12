var cookie = require("./cookie");
var header = function (arr) {
    this._headers = {};
    arr.forEach(function (n, i) {
        var t = i + 1;
        if (t % 2 !== 0) {
            this._headers[n.toLowerCase()] = arr[t];
        }
    }.bind(this));
};
header.prototype.getHost = function () {
    return this._headers.host;
};
header.prototype.getPort = function () {
    return this.getHost().split(":")[1];
};
header.prototype.getDomain = function () {
    return this.getHost().split(":")[0];
};
header.prototype.getConnection = function () {
    return this._headers.connection;
};
header.prototype.getAccept = function () {
    return this._headers.accept;
};
header.prototype.getUserAgent = function () {
    return this._headers["user-agent"];
};
header.prototype.getAcceptEncoding = function () {
    return this._headers["accept-encoding"];
};
header.prototype.getAcceptLanguage = function () {
    return this._headers["accept-language"];
};
header.prototype.getCookie = function () {
    return cookie(this._headers.cookie);
};
header.prototype.getAttr = function (key) {
    return this._headers[key];
};

var request = function (req, data) {
    this._headers = new header(data.rawHeaders);
    this._context = null;
    this._data = {};
    this._session = null;
    this._method = data.method;
    this._url = data.url;
    this._realreq = req;
    this._attr = {};
    brooder.extend(this._data, data.get);
    brooder.extend(this._data, data.post);
    brooder.extend(this._data, data.file);
};
request.prototype.getRealRequest = function () {
    return this._realreq;
};
request.prototype.getHeaders = function () {
    return this._headers;
};
request.prototype.getMethod = function () {
    return this._method;
};
request.prototype.hasPrarameter = function (key) {
    return this._data[key] !== undefined;
};
request.prototype.getParameter = function (key) {
    return this._data[key];
};
request.prototype.getParameters = function () {
    return this._data;
};
request.prototype.setAttr = function (key, value) {
    this._attr[key] = value;
    return this;
};
request.prototype.getAttr = function (key) {
    return this._attr[key];
};
request.prototype.hasAttr = function (key) {
    return this._attr[key] !== undefined;
};
request.prototype.removeAttr = function (key) {
    delete this._attr[key];
    return this;
};
request.prototype.removeAllAttr = function () {
    this._attr = {};
};
request.prototype.getURL = function () {
    return this._url;
};
request.prototype.getContext = function () {
    return this._context;
};
request.prototype.getSession = function () {
    return this._session;
};
request.prototype.isAjax = function () {
    return this.getHeaders().getAttr("X-Requested-With") === "XMLHttpRequest";
};
request.prototype.isPostRequest = function () {
    return this.getMethod() === "post";
};
request.prototype.isGetRequest = function () {
    return this.getMethod() === "get";
};
request.prototype.getHttpPath = function () {
    return "http://" + this.getHeaders().getHost() + "/" + this._project_ + "/";
};

module.exports = function (req, data) {
    return new request(req, data);
};