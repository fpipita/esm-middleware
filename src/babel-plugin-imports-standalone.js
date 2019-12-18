const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * This plugin handles a standalone `require()` call expression:
 *
 * ```diff
 * -require("foo")
 * +import "foo";
 * ```
 *
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
      if (
        !path.parentPath.isExpressionStatement() ||
        path.parentPath.get("expression") !== path
      ) {
        return;
      }
      const node = t.importDeclaration([], p1.node);
      hoist(path, node);
      path.remove();
    }
  }
});
