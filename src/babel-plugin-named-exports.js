const { isExportsBinding } = require("./helpers");

const t = require("@babel/types");

/**
 * This plugin handles a top level assignment to `module.exports`
 * when the `right` node of the assignment expression is an
 * `identifier.
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
