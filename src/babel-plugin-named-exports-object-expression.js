const { isExportsBinding } = require("./helpers");

const t = require("@babel/types");

/**
 * This plugin handles a top level assignment to `module.exports`
 * when the `right` node of the assignment expression is an
 * `object expression`.
 *
 * ```diff
 * -module.exports = { foo, bar, baz: getBaz() };
 * +module.exports = { foo, bar, baz: getBaz() };
 * +export { foo, bar };
 * +export const baz = module.exports.baz;
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
         * **module.exports** = { foo, bar };
         */
        const p1 = path.get("left");
        if (!p1.isMemberExpression()) {
          return;
        }
        /**
         * module.**exports** = { foo, bar };
         */
        const p2 = p1.get("property");
        if (Array.isArray(p2) || !isExportsBinding(p2)) {
          return;
        }
        /**
         * module.exports = **{ foo, bar }**;
         */
        const p3 = path.get("right");
        if (!p3.isObjectExpression()) {
          return;
        }
        /** @type {babel.types.ExportSpecifier[]} */
        const specifiers = [];
        for (const property of p3.get("properties")) {
          if (property.isObjectProperty()) {
            const key = property.get("key");
            if (Array.isArray(key) || !key.isIdentifier()) {
              continue;
            }
            if (
              path.scope.hasGlobal(key.node.name) ||
              path.scope.hasBinding(key.node.name)
            ) {
              /**
               * `foo` and `bar` are either bindings or globals, we
               * can export their identifiers
               */
              specifiers.push(t.exportSpecifier(key.node, key.node));
            } else {
              /**
               * `baz` is neither a global nor a binding, we can
               * declare a new identifier and bind it to the `baz`
               * referenced value
               */
              const node = t.exportNamedDeclaration(
                t.variableDeclaration("const", [
                  t.variableDeclarator(
                    key.node,
                    t.memberExpression(p1.node, key.node)
                  )
                ]),
                []
              );
              path.scope.getProgramParent().path.pushContainer("body", node);
            }
          }
        }
        if (specifiers.length <= 0) {
          return;
        }
        const node = t.exportNamedDeclaration(null, specifiers);
        path.scope.getProgramParent().path.pushContainer("body", node);
      }
    }
  }
});
