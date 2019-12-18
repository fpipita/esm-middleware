const ospath = require("path");
const fs = require("fs");
const { JS_FILE_PATTERN } = require("./helpers");

const PATH_SEPARATOR_REPLACER = /[/\\]+/g;
const MODULE_SPECIFIER_PATTERN = /^[./]/;

/**
 * @param  {...string} paths
 * @returns {string}
 */
function joinRelativePath(...paths) {
  const result = ospath.join(...paths);
  if (ospath.isAbsolute(result) || MODULE_SPECIFIER_PATTERN.test(result)) {
    return result;
  }
  return `.${ospath.sep}${result}`;
}

/**
 * @param {string} source
 * @param {string} currentModuleDir
 * @returns {string | null}
 */
function resolveValidModuleSpecifier(source, currentModuleDir) {
  const p = ospath.resolve(currentModuleDir, source);
  if (!fs.existsSync(p)) {
    if (!JS_FILE_PATTERN.test(p)) {
      return resolveValidModuleSpecifier(source + ".js", currentModuleDir);
    }
    return null;
  }
  const stat = fs.statSync(p);
  if (stat.isFile()) {
    return source;
  }
  /**
   * if we get here, source is a directory, before to look
   * for package.json, let's check whether a module with
   * the same basename exists
   */
  return (
    resolveValidModuleSpecifier(source + ".js", currentModuleDir) ||
    resolveValidModuleSpecifier(
      joinRelativePath(source, "index.js"),
      currentModuleDir
    )
  );
}

/**
 * @param {string} dir
 * @returns {string | null}
 */
function resolveNodeModuleFromPackageJson(dir) {
  const p = ospath.resolve(dir, "package.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  const pj = JSON.parse(String(fs.readFileSync(p)));
  let main = pj.module || pj["jsnext:main"] || pj.main;
  if (typeof pj.browser === "string") {
    /**
     * The browser field can also contain an object, see:
     * https://github.com/defunctzombie/package-browser-field-spec
     */
    main = pj.browser;
  }
  if (!main) {
    return null;
  }
  const finalPath = ospath.resolve(dir, main);
  if (fs.existsSync(finalPath)) {
    return finalPath;
  }
  if (finalPath.endsWith(".js")) {
    return null;
  }
  return finalPath + ".js";
}

/**
 * @param {string} source
 * @param {string} nodeModulesRoot
 * @returns {string | null} absolute path to a local script
 * if source could be resolved or null.
 */
function resolveInvalidModuleSpecifier(source, nodeModulesRoot) {
  const p = ospath.resolve(nodeModulesRoot, source);
  if (!fs.existsSync(p)) {
    if (!JS_FILE_PATTERN.test(p)) {
      return resolveInvalidModuleSpecifier(source + ".js", nodeModulesRoot);
    }
    return null;
  }
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    return (
      resolveNodeModuleFromPackageJson(p) ||
      resolveInvalidModuleSpecifier(
        ospath.join(source, "index.js"),
        nodeModulesRoot
      )
    );
  }
  return p;
}

/**
 * Resolves `source` to a valid esm import specifier.
 *
 * @param {string} source input module specifier.
 * @param {string} currentModuleDir absolute path to the
 * module's directory where `source` appears.
 * @param {import("./esm-middleware").EsmMiddlewareConfigObject} config
 * @returns {string | null} the resolved specifier or null
 * if no valid specifiers could be located.
 */
function resolveModule(source, currentModuleDir, config) {
  if (
    source.startsWith(config.nodeModulesPublicPath) &&
    fs.existsSync(
      source.replace(config.nodeModulesPublicPath, config.nodeModulesRoot)
    )
  ) {
    // Module source was already processed.
    return source;
  }
  if (MODULE_SPECIFIER_PATTERN.test(source)) {
    return resolveValidModuleSpecifier(source, currentModuleDir);
  }
  const p = resolveInvalidModuleSpecifier(source, config.nodeModulesRoot);
  if (p !== null && p.startsWith(config.nodeModulesRoot)) {
    return p.replace(config.nodeModulesRoot, config.nodeModulesPublicPath);
  }
  return null;
}

/**
 * @param {babel.NodePath<babel.types.ImportDeclaration | babel.types.ExportAllDeclaration | babel.types.ExportNamedDeclaration>} path
 * @param {import("./esm-middleware").BabelPluginEsmMiddlewareState} state
 */
function ImportDeclaration(path, state) {
  if (!path.node.source) {
    return;
  }
  const { config, currentModuleAbsolutePath } = state.opts;
  const source = resolveModule(
    path.node.source.value,
    ospath.dirname(currentModuleAbsolutePath),
    config
  );
  if (source === null || !JS_FILE_PATTERN.test(source)) {
    if (config.removeUnresolved) {
      path.remove();
    }
  } else {
    path.node.source.value = source.replace(PATH_SEPARATOR_REPLACER, "/");
  }
}

/**
 * This plugin rewrites module specifiers so that they
 * can be resolved to a path which is served by the middleware.
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    ImportDeclaration,
    ExportAllDeclaration: ImportDeclaration,
    ExportNamedDeclaration: ImportDeclaration
  }
});
