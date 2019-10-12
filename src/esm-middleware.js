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
      const moduleAbsPath = path.resolve(req.originalUrl.replace(/^\//, ""));
      if (!fs.existsSync(moduleAbsPath)) {
        return next();
      }
      const content = fs.readFileSync(moduleAbsPath);
      if (mimeType === "application/json") {
        code = `export default ${content};`;
        esmCache.set(req.originalUrl, code);
      } else {
        const result = babel.transformSync(content, {
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
    }
    res.set("Content-Type", "application/javascript");
    res.send(code);
  };
}

module.exports = esmMiddlewareFactory;
