const mime = require("mime-types");
const babel = require("@babel/core");
const path = require("path");
const fs = require("fs");
const esmResolverPlugin = require("./babel-plugin-esm-resolver.js");

function esmMiddlewareFactory({
  cache = true,
  root = path.resolve("."),
  nodeModulesRoot = path.resolve("node_modules")
} = {}) {
  const esmCache = new Map();

  return (req, res, next) => {
    const mimeType = mime.lookup(req.originalUrl);
    if (
      (mimeType !== "application/javascript" &&
        mimeType !== "application/json") ||
      req.query.nomodule
    ) {
      return next();
    }
    let code = esmCache.get(req.originalUrl);
    if (!code) {
      let absolutePath = req.originalUrl;
      if (!fs.existsSync(req.originalUrl)) {
        absolutePath = path.resolve(req.originalUrl.replace(/^\//, ""));
        if (!fs.existsSync(absolutePath)) {
          if (!fs.existsSync(absolutePath = path.join(root, req.originalUrl))) {
            return next();
          }
        }
      }
      const content = fs.readFileSync(absolutePath);
      if (mimeType === "application/json") {
        code = `export default ${content};`;
        esmCache.set(req.originalUrl, code);
      } else {
        const result = babel.transformSync(content, {
          plugins: [
            require("babel-plugin-syntax-dynamic-import"),
            esmResolverPlugin({
              nodeModulesRoot,
              currentModuleAbsolutePath: absolutePath
            })
          ]
        });
        code = result.code;
        if (cache) {
          esmCache.set(req.originalUrl, code);
        }
      }
    }
    res.set("Content-Type", "application/javascript");
    res.send(code);
  };
}

module.exports = esmMiddlewareFactory;
