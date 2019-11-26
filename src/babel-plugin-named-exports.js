const t = require("@babel/types");

/**
 * This plugin handles a top level assignment to `module.exports`:
 *
 * ```diff
 * -module.exports.foo = bar;
 * +module.exports.foo = bar;
 * +export { bar as foo };
 * ```
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    AssignmentExpression: {
      exit(path) {
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
        /**
         * module.**exports**.foo = bar;
         */
        const p6 = /** @type {babel.NodePath} */ (p2.get("property"));
        if (
          !p2.isIdentifier({ name: "exports" }) &&
          (!p2.isMemberExpression() || !p6.isIdentifier({ name: "exports" }))
        ) {
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
