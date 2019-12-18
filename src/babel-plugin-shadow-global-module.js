const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * This plugin checks whether there are any references left
 * to the global `module` and `exports` bindings after all
 * the AST transformations are applied and eventually shadows
 * global `module` and `exports` bindings by pushing their
 * local counterparts to the program scope.
 *
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    Program: {
      exit(path) {
        /**
         * It seems that Babel does not automatically update scope
         * info (e.g. reference count, globals etc) when the AST
         * changes so we need to manually do it and the proper way to
         * achieve it is by calling Scope.prototype.crawl().
         */
        path.scope.crawl();
        if (
          !path.scope.hasGlobal("module") &&
          !path.scope.hasGlobal("exports")
        ) {
          return;
        }
        const mod = t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier("module"),
            t.objectExpression([
              t.objectProperty(t.identifier("exports"), t.objectExpression([]))
            ])
          )
        ]);
        const exp = t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier("exports"),
            t.memberExpression(t.identifier("module"), t.identifier("exports"))
          )
        ]);
        hoist(path, mod, exp);
        if (path.get("body").find(n => n.isExportDefaultDeclaration())) {
          return;
        }
        const edd = t.exportDefaultDeclaration(
          t.memberExpression(t.identifier("module"), t.identifier("exports"))
        );
        path.pushContainer("body", edd);
      }
    }
  }
});
