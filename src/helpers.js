const SUPPORTED_MODULE_EXTENSIONS = ["js", "mjs", "json"];
const JS_FILE_PATTERN = new RegExp(
  `\\.(${SUPPORTED_MODULE_EXTENSIONS.join("|")})$`
);

/**
 * @param {babel.NodePath<any>} path
 * @returns {boolean}
 */
function searchInAssignmentExpression(path) {
  if (path.isMemberExpression()) {
    path = /** @type {babel.NodePath} */ (path.get("property"));
  }
  if (path.isIdentifier({ name: "exports" })) {
    return true;
  }
  if (path.isAssignmentExpression()) {
    const found = searchInAssignmentExpression(path.get("left"));
    if (found) {
      return true;
    }
    return searchInAssignmentExpression(path.get("right"));
  }
  return false;
}
/**
 * @param {babel.NodePath} path
 * @returns {boolean} `true` if `path` is a direct or indirect
 * reference to `exports`, e.g.
 *
 * ```javascript
 * // `exports` is an `exports` direct reference
 * exports.foo = 'bar';
 *
 * // assert and ok are references to `exports`
 * var assert = module.exports = ok;
 *
 * // `foo` is an indirect reference to `exports`
 * module.exports = foo;
 * ```
 */
function isExportsBinding(path) {
  if (path.isIdentifier({ name: "exports" })) {
    return true;
  }
  const p1 = /** @type {babel.NodePath} */ (path.get("property"));
  if (path.isMemberExpression() && p1.isIdentifier({ name: "exports" })) {
    return true;
  }
  if (!path.isIdentifier()) {
    return false;
  }
  const b1 = path.scope.getBinding(path.node.name);
  if (!b1) {
    return false;
  }
  /**
   * **var assert = module.exports = ok**;
   */
  const p2 = b1.path;
  if (p2.isVariableDeclarator()) {
    /**
     * var assert = **module.exports = ok**;
     */
    const p3 = p2.get("init");
    if (p3.isExpression()) {
      const found = searchInAssignmentExpression(p3);
      if (found) {
        return true;
      }
      return isExportsBinding(p3);
    }
  }
  for (const p4 of b1.referencePaths) {
    if (p4.parentPath.isAssignmentExpression()) {
      const found = searchInAssignmentExpression(p4.parentPath);
      if (found) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Inserts the given nodes after any `import` declarations already
 * present in the program body. If none of them is found, it inserts
 * the nodes first in the program's body.
 *
 * @param {babel.NodePath} path
 * @param {...babel.Node} nodes
 */
function hoist(path, ...nodes) {
  const program = /** @type {babel.NodePath<babel.types.Program>} */ (path.find(
    n => n.isProgram()
  ));
  const body = program.get("body").filter(n => n.isImportDeclaration());
  if (body.length > 0) {
    body[body.length - 1].insertAfter(nodes);
  } else {
    program.unshiftContainer("body", nodes);
  }
}

module.exports = {
  isExportsBinding,
  hoist,
  SUPPORTED_MODULE_EXTENSIONS,
  JS_FILE_PATTERN
};
