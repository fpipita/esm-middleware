const crypto = require("crypto");
const babel = require("@babel/core");
const path = require("path");
const fs = require("fs");
const esmResolverPlugin = require("./babel-plugin-esm-resolver.js");
const syntaxDynamicImportPlugin = require("babel-plugin-syntax-dynamic-import");
const { JS_FILE_PATTERN } = require("./constants");

/**
 * @typedef {Object} CacheEntry
 * @property {string} hash
 * @property {string} code
 */

/**
 * @typedef {Object} EsmMiddlewareConfigObject
 * @property {string=} root optional, absolute path where user
 * code is located. Defaults to the current working directory.
 * @property {string=} nodeModulesRoot optional, absolute path
 * where npm packages are located. Defaults to `node_modules`
 * resolved relative to the current working directory.
 * @property {boolean=} removeUnresolved if `true`, modules that
 * couldn't be resolved are removed.
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
function esmMiddlewareFactory(root = path.resolve(), options = {}) {
  if (typeof root !== "string") {
    options = /** @type {EsmMiddlewareConfigObject} */ (root);
    root = options.root;
  }
  if (!root || !path.isAbsolute(root)) {
    throw new TypeError("root: absolute path expected");
  }
  /** @type {EsmMiddlewareConfigObject} */
  const finalOptions = {
    nodeModulesRoot: path.resolve("node_modules"),
    removeUnresolved: true,
    ...options
  };
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
        syntaxDynamicImportPlugin,
        esmResolverPlugin({
          nodeModulesRoot: finalOptions.nodeModulesRoot,
          currentModuleAbsolutePath: filePath,
          removeUnresolved: finalOptions.removeUnresolved
        })
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
  function translateToLocalPath(url) {
    if (
      !finalOptions.nodeModulesRoot ||
      !path.isAbsolute(finalOptions.nodeModulesRoot)
    ) {
      throw new TypeError("nodeModulesRoot: absolute path expected");
    }
    const nodeModulesRootBasename = path.basename(finalOptions.nodeModulesRoot);
    if (url.slice(1).startsWith(nodeModulesRootBasename)) {
      return path.join(path.dirname(finalOptions.nodeModulesRoot), url);
    }
    const rootBasename = path.basename(root);
    if (url.slice(1).startsWith(rootBasename)) {
      return path.join(path.dirname(root), url);
    }
    return path.join(root, url);
  }

  /** @type {import("express").Handler} */
  function esmMiddleware(req, res, next) {
    if (req.query.nomodule || !JS_FILE_PATTERN.test(req.url)) {
      return next();
    }
    const filePath = translateToLocalPath(req.url);
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
