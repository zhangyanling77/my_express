// 创建应用
const http = require("http");
const url = require("url");
let Router = require("./router");
const path = require("path");
const fs = require("fs");
const STATUS_CODES = require("statuses").STATUS_CODES; // 状态码映射库
// 提供应用 应用和路由的分离
function Application() {
  this.engines = {
    views: "views",
    "view engine": "ejs"
  };
  this.settings = {};
}
// 路由懒加载
Application.prototype.lazy_route = function() {
  if (!this.router) {
    this.router = new Router();
    // 默认初始化一个中间件 内置的中间件
    this._init();
  }
};
// 初始化
Application.prototype._init = function() {
  // 默认就是第一个中间件
  this.use((req, res, next) => {
    // sendFile
    res.sendFile = function(filename) {
      fs.createReadStream(filename).pipe(res);
    };
    // json
    res.json = function(value) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(value));
    };
    // send
    res.send = function(value) {
      if (typeof value === "object") {
        res.end(JSON.stringify(value));
      } else if (typeof value === "number") {
        res.statusCode = value;
        res.end(STATUS_CODES[value]);
      } else {
        res.end(value);
      }
    };
    // render
    res.render = (fielname, obj) => {
      // 实现内置的模板渲染方法
      let views = this.get("views") || this.engines['views']; // view 如果没有设置，默认为views
      let viewEngine = this.get("view engine") || this.engines['view engine']; // .html 如果没有设置，默认为ejs
      let render = this.engines[viewEngine]; // renderFile方法
      let filepath = path.join(views, fielname) + viewEngine;
      render(filepath, obj, function(err, html) {
        res.end(html);
      });
    };
    next();
  });
};
// set设置
Application.prototype.set = function(key, value) {
  // set包含了获取的功能
  if (arguments.length === 1) {
    // 取值
    return this.settings[key];
  }
  this.settings[key] = value;
};
// 引擎设置
Application.prototype.engine = function(extname, render) {
  this.engines[extname] = render;
};
// 根据不同的调用方法 将route中的handler 和方法类型做对应
["post", "put", "delete", "get"].forEach(method => {
  Application.prototype[method] = function(path, ...handlers) {
    if (method === "get") {
      // 有可能是要获取属性, 内部会看 如果参数是一个
      if (arguments.length == 1) {
        return this.set(path);
      }
    }
    this.lazy_route();
    this.router[method](path, handlers);
  };
});
// 处理用户订阅的属性
Application.prototype.param = function(key, handler) {
  this.lazy_route();
  this.router.param(key, handler);
};
// 使用中间件
Application.prototype.use = function(path, handler) {
  this.lazy_route();
  // 如果没有传递路径 直接将路径设置/ ,/表示都能匹配
  if (typeof handler !== "function") {
    handler = path;
    path = "/";
  }
  this.router.use(path, handler);
};
// 监听
Application.prototype.listen = function() {
  let server = http.createServer((req, res) => {
    this.lazy_route();
    // 兜底操作
    function done() {
      res.end(`Cannot ${req.method} ${req.url}`);
    }
    this.router.handle_request(req, res, done);
  });
  server.listen(...arguments);
};

module.exports = Application;
