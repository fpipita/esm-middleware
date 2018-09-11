const mime = require("mime");
const babel = require("@babel/core");
const path = require("path");
const _fs = require("fs");
const esmResolverPlugin = require("./babel-plugin-esm-resolver.js");

function esmMiddlewareFactory({
  fs = _fs,
  cache = true,
  modulesRootDirectory = path.resolve("node_modules")
} = {}) {
  const esmCache = new Map();

  return (req, res, next) => {
    if (
      mime.lookup(req.originalUrl) !== "application/javascript" ||
      req.query.nomodule
    ) {
      return next();
    }
    let code = esmCache.get(req.originalUrl);
    if (!code) {
      const moduleAbsPath = path.resolve(req.originalUrl.replace(/^\//, ""));
      if (!fs.existsSync(moduleAbsPath)) {
        return next();
      }
      const result = babel.transformSync(fs.readFileSync(moduleAbsPath), {
        plugins: [esmResolverPlugin({ fs, modulesRootDirectory })]
      });
      code = result.code;
      if (cache) {
        esmCache.set(req.originalUrl, code);
      }
    }
    res.set("Content-Type", "application/javascript");
    res.send(code);
  };
}

module.exports = esmMiddlewareFactory;
