const mime = require("mime-types");
const babel = require("@babel/core");
const path = require("path");
const fs = require("fs");
const esmResolverPlugin = require("./babel-plugin-esm-resolver.js");

function esmMiddlewareFactory({
  cache = true,
  nodeModulesRoot = path.resolve("node_modules")
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
        plugins: [
          require("babel-plugin-syntax-dynamic-import"),
          esmResolverPlugin({
            nodeModulesRoot,
            currentModuleAbsolutePath: moduleAbsPath
          })
        ]
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
