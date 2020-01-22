const crypto = require("crypto");
const babel = require("@babel/core");
const path = require("path");
const { JS_FILE_PATTERN } = require("./helpers");

/**
 * Babel plugin handbook https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
 * ESTree AST reference https://github.com/babel/babylon/blob/master/ast/spec.md
 */

/**
 * @typedef {Object} BabelPluginEsmResolverOptions
 * @property {string} currentModuleAbsolutePath
 * @property {import("./esm-middleware").EsmMiddlewareConfigObject} config
 */

/**
 * @typedef {Object} BabelPluginEsmMiddlewareState
 * @property {BabelPluginEsmResolverOptions} opts
 */

/**
 * @callback EsmMiddlewareBabelPlugin
 * @returns {babel.PluginObj<BabelPluginEsmMiddlewareState>}
 */

/**
 * @typedef {Object} CacheEntry
 * @property {string} hash
 * @property {string} code
 */

/**
 * @typedef {Object} EsmMiddlewareConfigObject
 * @property {string} [root=path.resolve()] absolute local path where user
 * code is located.
 * @property {string} [rootPublicPath="/"] defines the endpoint at which
 * source code will be made available.
 * @property {string} [nodeModulesRoot=path.resolve("node_modules")]
 * absolute local path pointing to the directory where npm packages
 * are located.
 * @property {string} [nodeModulesPublicPath="/node_modules"] defines
 * the endpoint at which node_modules will be made available.
 * @property {boolean} [removeUnresolved=true] if `true`, modules that
 * couldn't be resolved are removed.
 * @property {boolean} [disableCaching=false] if `true`, caching will be
 * disabled and modules will be recompiled on each request.
 * @property {typeof import("fs")} [_fs] only used for testing purposes,
 * it is an object implementing the `fs` module interface.
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
    disableCaching: false,
    _fs: require("fs"),
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
    const options = {
      currentModuleAbsolutePath: filePath,
      config: finalOptions
    };
    const result = babel.transformSync(content, {
      plugins: [
        require("@babel/plugin-syntax-dynamic-import"),
        [require("./babel-plugin-shadow-global-module"), options],
        [require("./babel-plugin-module-specifiers"), options],
        [require("./babel-plugin-named-exports"), options],
        [require("./babel-plugin-named-exports-object-expression"), options],
        [require("./babel-plugin-named-exports-factory"), options],
        [require("./babel-plugin-named-exports-factory-call"), options],
        [require("./babel-plugin-imports-declaration"), options],
        [require("./babel-plugin-imports-declaration-object-pattern"), options],
        [require("./babel-plugin-imports-standalone"), options],
        [require("./babel-plugin-imports-expression"), options],
        [require("./babel-plugin-node-globals"), options]
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
    if (finalOptions.disableCaching) {
      return transform(filePath, content);
    }
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
    if (!JS_FILE_PATTERN.test(req.path)) {
      return next();
    }
    const filePath = mapUrlToLocalPath(req.path);
    if (!finalOptions._fs.existsSync(filePath)) {
      return next();
    }
    const content = finalOptions._fs.readFileSync(filePath, {
      encoding: "utf8"
    });
    const code = req.query.nomodule ? content : getCode(filePath, content);
    if (!code) {
      return next();
    }
    res.set("Content-Type", "application/javascript");
    res.send(code);
  }

  return esmMiddleware;
}

module.exports = esmMiddlewareFactory;
