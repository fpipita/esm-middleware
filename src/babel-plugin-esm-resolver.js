const path = require("path");
const _fs = require("fs");
const t = require("@babel/types");

function esmResolverPluginFactory({
  fs = _fs,
  modulesRootDirectory = path.resolve("node_modules")
} = {}) {
  return function() {
    return {
      visitor: {
        Program(path) {
          if (
            path.node.body.some(
              node => t.isExportDeclaration(node) || t.isImportDeclaration(node)
            )
          ) {
            return;
          }
          path
            .get("body.0")
            .insertBefore(
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier("module"),
                  t.objectExpression([
                    t.objectProperty(
                      t.stringLiteral("exports"),
                      t.objectExpression([])
                    )
                  ])
                )
              ])
            );
          path
            .get("body.0")
            .insertAfter(
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier("exports"),
                  t.memberExpression(
                    t.identifier("module"),
                    t.identifier("exports")
                  )
                )
              ])
            );
          path
            .get("body.1")
            .insertAfter(
              t.exportDefaultDeclaration(
                t.memberExpression(
                  t.identifier("module"),
                  t.identifier("exports")
                )
              )
            );
        },
        "ImportDeclaration|ExportDeclaration"(astPath) {
          const source = astPath.node.source;
          if (!source) {
            return;
          }
          if (/[./]/.test(source.value[0])) {
            if (
              !source.value.endsWith(".js") &&
              !source.value.endsWith(".mjs")
            ) {
              source.value = `${source.value}.js`;
            }
            return;
          }
          let modulePath = path.resolve(modulesRootDirectory, source.value);
          if (!fs.existsSync(modulePath)) {
            modulePath = modulePath + ".js";
            if (!fs.existsSync(modulePath)) {
              return;
            }
          }
          const stats = fs.statSync(modulePath);
          if (stats.isFile()) {
            source.value = modulePath.replace(process.cwd(), "");
            return;
          }
          const pkg = JSON.parse(
            fs.readFileSync(path.resolve(modulePath, "package.json"))
          );
          const esRelative = pkg.module || pkg["jsnext:main"] || pkg.main;
          if (typeof esRelative !== "string") {
            return;
          }
          const esPath = path.resolve(modulePath, esRelative);
          source.value = esPath.replace(process.cwd(), "");
        }
      }
    };
  };
}

module.exports = esmResolverPluginFactory;
