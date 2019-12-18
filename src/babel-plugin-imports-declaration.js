const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * @param {babel.NodePath} path
 * @param {string} localName
 * @returns {boolean}
 */
function isDuplicateImport(path, localName) {
  const program = /** @type {babel.NodePath<babel.types.Program>} */ (path.scope.getProgramParent()
    .path);
  for (const child of program.get("body")) {
    if (child.isImportDeclaration()) {
      for (const spec of child.get("specifiers")) {
        if (
          spec.isImportDefaultSpecifier() &&
          spec.get("local").node.name === localName
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * This plugin handles a `require()` call expression happening
 * as the init node in a variable declarator, where the variable
 * declarator's `id` node is an `identifier`:
 *
 * ```diff
 * -const y = require("./y"), t = require("./t");
 * +import y from "./y";
 * +import t from "./t";
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
      if (Array.isArray(p3) || !p3.isIdentifier()) {
        return;
      }
      if (isDuplicateImport(path, p3.node.name)) {
        path.parentPath.remove();
        return;
      }
      const node = t.importDeclaration(
        [t.importDefaultSpecifier(p3.node)],
        p1.node
      );
      hoist(path, node);
      path.parentPath.remove();
    }
  }
});
