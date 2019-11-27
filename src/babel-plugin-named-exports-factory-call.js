const t = require("@babel/types");

/**
 * This plugin handles assignment to `module.exports` through
 * factory function invoked by the `Function.prototype.call`
 * method:
 *
 * ```diff
 * -(function(e){e.bar='foo'}).call(this, exports)
 * +(function(e){e.bar='foo'}).call(this, exports)
 * +export const bar = exports.bar
 * ```
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    AssignmentExpression: {
      exit(path) {
        /**
         * (function(e){**e.bar**='foo'}).call(this, exports)
         */
        const p1 = path.get("left");
        if (!p1.isMemberExpression()) {
          return;
        }
        /**
         * (function(e){e.**bar**='foo'}).call(this, exports)
         */
        const p2 = /** @type {babel.NodePath} */ (p1.get("property"));
        if (!p2.isIdentifier()) {
          return;
        }
        /**
         * (function(e){**e**.bar='foo'}).call(this, exports)
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
         * (function(**e**){e.bar='foo'}).call(this, exports)
         */
        const p4 = b1.path;
        if (p4.listKey !== "params") {
          return;
        }
        /**
         * (**function(e){e.bar='foo'}**).call(this, exports)
         */
        const p7 = p4.parentPath;
        if (p7.parentKey !== "object") {
          return;
        }
        /**
         * **(function(e){e.bar='foo'}).call**(this, exports)
         */
        const p5 =
          /** @type {babel.NodePath<babel.types.MemberExpression>} */ (p7.parentPath);
        /**
         * (function(e){e.bar='foo'}).**call**(this, exports)
         */
        const p8 = /** @type {babel.NodePath} */ (p5.get("property"));
        if (!p8.isIdentifier({ name: "call" })) {
          return;
        }
        /**
         * **(function(e){e.bar='foo'}).call(this, exports)**
         */
        const p9 = p5.parentPath;
        if (!p9.isCallExpression()) {
          return;
        }
        /**
         * (function(e){e.bar='foo'}).call(this, **exports**)
         */
        const p6 = p9.get("arguments")[/** @type {number} */ (p4.key) + 1];
        const state = { found: false };
        p6.traverse(
          {
            Identifier(path, state) {
              if (path.node.name === "exports") {
                state.found = true;
                path.stop();
              }
            }
          },
          state
        );
        if (!state.found) {
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
              )
            ]),
            [t.exportSpecifier(p2.node, p2.node)]
          );
          program.pushContainer("body", node);
        }
      }
    }
  }
});
