const crypto = require("crypto");
const babel = require("@babel/core");
const path = require("path");
const fs = require("fs");
const { JS_FILE_PATTERN } = require("./constants");

/**
 * @typedef {Object} CacheEntry
 * @property {string} hash
 * @property {string} code
 */

/**
 * @typedef {Object} EsmMiddlewareConfigObject
 * @property {string=} root absolute local path where user
 * code is located. Defaults to `process.cwd()`.
 * @property {string=} rootPublicPath defines the endpoint at which
 * source code will be made available. Defaults to `/`.
 * @property {string=} nodeModulesRoot absolute local path
 * pointing to the directory where npm packages are located.
 * Defaults to `${process.cwd()}/node_modules`.
 * @property {string=} nodeModulesPublicPath defines the endpoint
 * at which node_modules will be made available. Defaults to `/node_modules`.
 * @property {boolean=} removeUnresolved if `true`, modules that
 * couldn't be resolved are removed. Defaults to `false`.
 */

/**
 * @typedef {EsmMiddlewareConfigObject | string} EsmMiddlewareOptions
 */

/**
 *
 * @param {EsmMiddlewareOptions=} root optional, combined with req.url,
 * determines the file to serve. Defaults to the current
 * working directory.
 * @param {EsmMiddlewareConfigObject=} options
 * @returns {import("express").Handler}
 */
function esmMiddlewareFactory(root = path.resolve(), options) {
  if (typeof root !== "string") {
    options = /** @type {EsmMiddlewareConfigObject} */ (root);
    root = options.root;
  }
  /** @type {EsmMiddlewareConfigObject} */
  const finalOptions = {
    root,
    rootPublicPath: "/",
    nodeModulesRoot: path.resolve("node_modules"),
    nodeModulesPublicPath: "/node_modules",
    removeUnresolved: true,
    ...options
  };
  if (!finalOptions.root || !path.isAbsolute(finalOptions.root)) {
    throw new TypeError("root: absolute path expected");
  }
  if (
    !finalOptions.nodeModulesRoot ||
    !path.isAbsolute(finalOptions.nodeModulesRoot)
  ) {
    throw new TypeError("nodeModulesRoot: absolute path expected");
  }
  /** @type {Map<string, CacheEntry>} */
  const cache = new Map();

  /**
   * @param {string} filePath
   * @param {string} content
   * @returns {string | null}
   */
  function transform(filePath, content) {
    if (filePath.endsWith(".json")) {
      return `export default ${content};`;
    }
    const result = babel.transformSync(content, {
      plugins: [
        require("babel-plugin-syntax-dynamic-import"),
        [
          require("./babel-plugin-esm-resolver"),
          {
            currentModuleAbsolutePath: filePath,
            config: finalOptions
          }
        ]
      ]
    });
    if (result && result.code) {
      return result.code;
    }
    return null;
  }

  /**
   * @param {string} filePath
   * @param {string} content
   * @returns {string | null}
   */
  function getCode(filePath, content) {
    const hash = crypto
      .createHash("md5")
      .update(content)
      .digest("hex");
    const cachedCode = cache.get(filePath);
    if (typeof cachedCode !== "undefined" && cachedCode.hash === hash) {
      return cachedCode.code;
    }
    const code = transform(filePath, content);
    if (code) {
      cache.set(filePath, { hash, code });
    } else {
      cache.delete(filePath);
    }
    return code;
  }

  /**
   * @param {string} url
   * @returns {string}
   */
  function mapUrlToLocalPath(url) {
    if (url.startsWith(finalOptions.nodeModulesPublicPath)) {
      return path.join(
        finalOptions.nodeModulesRoot,
        url.replace(finalOptions.nodeModulesPublicPath, "")
      );
    }
    return path.join(
      finalOptions.root,
      url.replace(finalOptions.rootPublicPath, "")
    );
  }

  /** @type {import("express").Handler} */
  function esmMiddleware(req, res, next) {
    if (req.query.nomodule || !JS_FILE_PATTERN.test(req.url)) {
      return next();
    }
    const filePath = mapUrlToLocalPath(req.url);
    if (!fs.existsSync(filePath)) {
      return next();
    }
    const content = fs.readFileSync(filePath, { encoding: "utf8" });
    const code = getCode(filePath, content);
    if (!code) {
      return next();
    }
    res.set("Content-Type", "application/javascript");
    res.send(code);
  }

  return esmMiddleware;
}

module.exports = esmMiddlewareFactory;
