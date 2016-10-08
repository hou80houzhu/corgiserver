var response = function (res) {
    this._cookie = {};
    this._headers = {};
    this._statusCode = 200;
    this._data = null;
    this._pipe=null;
};
response.prototype.setHeader = function (key, value) {
    this._headers[key] = value;
    return this;
};
response.prototype.setCookie = function (key, value) {
    this._cookie[key] = value;
    return this;
};
response.prototype.setStatusCode = function (code) {
    this._statusCode = code;
    return this;
};
response.prototype.setContentType = function (type) {
    this._headers["Content-Type"] = type;
    return this;
};
response.prototype.write = function () {
    this._data = Array.prototype.slice.call(arguments);
    return this;
};
response.prototype.pipe = function (a) {
    this._pipe = a;
    return this;
};

module.exports = function (res) {
    return new response(res);
};