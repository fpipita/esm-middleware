const t = require("@babel/types");

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
 * This plugin handles a top level assignment to `module.exports`.
 *
 * Assignment can be direct:
 *
 * ```diff
 * -module.exports.foo = bar;
 * +module.exports.foo = bar;
 * +export { bar as foo };
 * ```
 * or indirect:
 *
 * ```diff
 * -var assert = module.exports = ok;
 * -assert.ok = ok;
 * +var assert = module.exports = ok;
 * +assert.ok = ok;
 * +export { ok };
 * ```
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    AssignmentExpression: {
      exit(path) {
        if (path.findParent(parent => parent.isBlockStatement())) {
          return;
        }
        /**
         * **module.exports.foo** = bar;
         */
        const p1 = path.get("left");
        if (!p1.isMemberExpression()) {
          return;
        }
        /**
         * module.exports.**foo** = bar;
         */
        const p4 = /** @type {babel.NodePath} */ (p1.get("property"));
        if (!p4.isIdentifier()) {
          return;
        }
        /**
         * module.exports.foo = **bar**;
         */
        const p3 = path.get("right");
        if (!p3.isIdentifier()) {
          return;
        }
        /**
         * **module.exports**.foo = bar;
         */
        const p2 = p1.get("object");
        if (!isExportsBinding(p2)) {
          return;
        }

        const node = t.exportNamedDeclaration(null, [
          t.exportSpecifier(p3.node, p4.node)
        ]);
        path.scope.getProgramParent().path.pushContainer("body", node);
      }
    }
  }
});
