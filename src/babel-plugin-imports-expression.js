const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * The require() call is part of an expression.
 *
 * ```diff
 * -module.exports.foo = require("bar")
 * +import _require from "bar";
 * +module.exports.foo = _require;
 * ```
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    CallExpression(path) {
      if (!path.get("callee").isIdentifier({ name: "require" })) {
        return;
      }
      const p1 = path.get("arguments")[0];
      if (!p1.isStringLiteral()) {
        return;
      }
      if (!path.findParent(parent => parent.isExpression())) {
        return;
      }
      const id = path.scope
        .getProgramParent()
        .generateUidIdentifierBasedOnNode(path.node);
      const node = t.importDeclaration([t.importDefaultSpecifier(id)], p1.node);
      hoist(path, node);
      path.replaceWith(id);
    }
  }
});
