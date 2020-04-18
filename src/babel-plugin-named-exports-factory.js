const t = require("@babel/types");

/**
 * This plugin handles assignment to `module.exports` through
 * a factory function (classical `UMD` pattern):
 *
 * ```diff
 * -!function(t){t(exports)}(function(e){e.bar='foo'})
 * +!function(t){t(exports)}(function(e){e.bar='foo'})
 * +export const bar = exports.bar;
 * ```
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    AssignmentExpression: {
      exit(path) {
        /**
         * !function(t){t(exports)}(function(e){**e.bar**='foo'})
         */
        const p1 = path.get("left");
        if (!p1.isMemberExpression()) {
          return;
        }
        /**
         * !function(t){t(exports)}(function(e){e.**bar**='foo'})
         */
        const p2 = /** @type {babel.NodePath} */ (p1.get("property"));
        if (!p2.isIdentifier()) {
          return;
        }
        /**
         * !function(t){t(exports)}(function(e){**e**.bar='foo'})
         */
        const p3 = /** @type {babel.NodePath} */ (p1.get("object"));
        if (!p3.isIdentifier()) {
          return;
        }
        const b1 = path.scope.getBinding(p3.node.name);
        if (!b1) {
          return;
        }
        /**
         * !function(t){t(exports)}(function(**e**){e.bar='foo'})
         */
        const p4 = b1.path;
        if (p4.listKey !== "params") {
          return;
        }
        /**
         * !function(t){t(exports)}(**function(e){e.bar='foo'}**)
         */
        const p7 = p4.parentPath;
        if (p7.listKey !== "arguments") {
          return;
        }
        /**
         * !**function(t){t(exports)}**(function(e){e.bar='foo'})
         */
        const p5 = /** @type {babel.NodePath<babel.types.FunctionExpression>} */ (p7.parentPath.get(
          "callee"
        ));
        /**
         * !function(**t**){t(exports)}(function(e){e.bar='foo'})
         */
        const p6 = p5.get("params")[/** @type {number} */ (p7.key)];
        if (!p6 || !p6.isIdentifier()) {
          return;
        }
        const b2 = p6.scope.getBinding(p6.node.name);
        if (!b2) {
          return;
        }
        /**
         * !function(t){**t(exports)**}(function(e){e.bar='foo'})
         */
        const factory = b2.referencePaths.find(
          (ref) =>
            ref.parentPath.isCallExpression() &&
            ref.parentPath.get("arguments")[0].isIdentifier({ name: "exports" })
        );
        if (!factory) {
          return;
        }
        const program = path.scope.getProgramParent().path;
        if (p2.node.name === "default") {
          const node = t.exportDefaultDeclaration(
            t.memberExpression(t.identifier("exports"), t.identifier("default"))
          );
          program.pushContainer("body", node);
        } else {
          const node = t.exportNamedDeclaration(
            t.variableDeclaration("const", [
              t.variableDeclarator(
                p2.node,
                t.memberExpression(t.identifier("exports"), p2.node)
              ),
            ]),
            [t.exportSpecifier(p2.node, p2.node)]
          );
          program.pushContainer("body", node);
        }
      },
    },
  },
});
