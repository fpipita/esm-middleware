const path = require("path");
const fs = require("fs");
const { JS_FILE_PATTERN } = require("./constants");

const MODULE_SPECIFIER_PATTERN = /^[./]/;

/**
 * @param  {...string} paths
 * @returns {string}
 */
function joinRelativePath(...paths) {
  const result = path.join(...paths);
  if (path.isAbsolute(result) || MODULE_SPECIFIER_PATTERN.test(result)) {
    return result;
  }
  return `.${path.sep}${result}`;
}

/**
 * @param {string} source
 * @param {string} currentModuleDir
 * @returns {string | null}
 */
function resolveValidModuleSpecifier(source, currentModuleDir) {
  const p = path.resolve(currentModuleDir, source);
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
  const p = path.resolve(dir, "package.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  const pj = JSON.parse(String(fs.readFileSync(p)));
  const m = pj.module || pj["jsnext:main"] || pj.main;
  if (!m) {
    return null;
  }
  const finalPath = path.resolve(dir, m);
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
  const p = path.resolve(nodeModulesRoot, source);
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
        path.join(source, "index.js"),
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
  if (MODULE_SPECIFIER_PATTERN.test(source)) {
    return resolveValidModuleSpecifier(source, currentModuleDir);
  }
  const p = resolveInvalidModuleSpecifier(source, config.nodeModulesRoot);
  if (p !== null) {
    return p.replace(config.nodeModulesRoot, config.nodeModulesPublicPath);
  }
  return null;
}

module.exports = {
  resolveModule
};
