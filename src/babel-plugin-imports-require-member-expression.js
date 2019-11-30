const t = require("@babel/types");
const { hoist } = require("./common");

/**
 * ```diff
 * -var foo = require("bar").foo;
 * +import _require from "bar";
 * +var foo = _require.foo;
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
      if (!path.parentPath.isMemberExpression()) {
        return;
      }
      if (path.key !== "object") {
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
