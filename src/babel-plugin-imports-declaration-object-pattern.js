const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * This plugin handles a `require()` call expression happening
 * as the init node in a variable declarator when the variable
 * declarator's `id` node is an object destructuring pattern:
 *
 * ```diff
 * -const { x, y } = require("./z");
 * +import { x, y } from "./z";
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
      const p2 = path.parentPath;
      if (!p2.isVariableDeclarator()) {
        return;
      }
      const p3 = path.parentPath.get("id");
      if (Array.isArray(p3) || !p3.isObjectPattern()) {
        return;
      }
      /** @type {babel.types.ImportSpecifier[]} */
      const specifiers = [];
      for (const property of p3.get("properties")) {
        if (property.isObjectProperty()) {
          const key = property.get("key");
          if (!Array.isArray(key) && key.isIdentifier()) {
            specifiers.push(t.importSpecifier(key.node, key.node));
          }
        }
      }
      const node = t.importDeclaration(specifiers, p1.node);
      hoist(path, node);
      path.parentPath.remove();
    },
  },
});
