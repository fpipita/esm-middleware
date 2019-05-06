const path = require("path");
const _fs = require("fs");
const t = require("@babel/types");
const template = require("@babel/template").default;

// Babel plugin handbook https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
// ESTree AST reference https://github.com/babel/babylon/blob/master/ast/spec.md

const JAVASCRIPT_MODULE_EXTENSION_PATTERN = /^(\.(js|mjs))$/;
const VALID_IMPORT_DECLARATION_SOURCE = /^[./]/;

const buildExportDefault = template(`
  export default %%exportDefaultDeclaration%%;
`);
const buildImportWithNoBinding = template(`
  import %%importSpecifier%%;
`);

const buildImportBindingFromDefault = template(`
  import %%binding%% from %%source%%;
`);

function findLastImportStatementPath(programPath) {
  const { body } = programPath.node;
  for (let i = body.length - 1; i >= 0; i--) {
    if (t.isImportDeclaration(body[i])) {
      return programPath.get(`body.${i}`);
    }
  }
  return null;
}

function esmResolverPluginFactory({
  currentModuleAbsolutePath,
  fs = _fs,
  modulesRootDirectory = path.resolve("node_modules")
} = {}) {
  return function() {
    return {
      visitor: {
        Program: {
          exit(path) {
            if (path.node.body.some(t.isModuleDeclaration)) {
              return;
            }
            path.unshiftContainer(
              "body",
              template.ast`
                const module = { exports: {} };
                const exports = module.exports;
                export default module.exports;
              `
            );
          }
        },
        AssignmentExpression: {
          exit(path) {
            const left = path.get("left");
            if (path.scope.parent !== null) {
              return;
            }
            if (!left.isMemberExpression()) {
              return;
            }
            if (
              !left.get("object").isIdentifier({ name: "module" }) ||
              !left.get("property").isIdentifier({ name: "exports" })
            ) {
              return;
            }
            path.replaceWithMultiple(
              buildExportDefault({
                exportDefaultDeclaration: path.get("right").node
              })
            );
          }
        },
        CallExpression(path) {
          if (path.scope.parent !== null) {
            return;
          }
          if (!path.get("callee").isIdentifier({ name: "require" })) {
            return;
          }
          const program = path.findParent(path => path.isProgram());
          let importDeclaration;
          if (path.getStatementParent().get("expression") === path) {
            importDeclaration = buildImportWithNoBinding({
              importSpecifier: path.get("arguments.0").node
            });
            path.remove();
          } else {
            const binding = path.scope.generateUidIdentifier("require");
            importDeclaration = buildImportBindingFromDefault({
              binding,
              source: path.get("arguments.0").node
            });
            path.replaceWith(binding);
          }
          const lastImportStatement = findLastImportStatementPath(program);
          if (lastImportStatement) {
            lastImportStatement.insertAfter(importDeclaration);
          } else {
            program.unshiftContainer("body", importDeclaration);
          }
        },
        ModuleDeclaration(astPath) {
          const source = astPath.node.source;
          if (!source) {
            return;
          }
          const ext = path.extname(source.value);
          if (
            VALID_IMPORT_DECLARATION_SOURCE.test(source.value) &&
            !JAVASCRIPT_MODULE_EXTENSION_PATTERN.test(ext)
          ) {
            const currentDirectory = path.dirname(currentModuleAbsolutePath);
            const maybeJsFileWithNoExtension = path.join(
              currentDirectory,
              `${source.value}.js`
            );
            if (
              fs.existsSync(maybeJsFileWithNoExtension) &&
              fs.statSync(maybeJsFileWithNoExtension).isFile()
            ) {
              source.value = `${source.value}.js`;
              return;
            }
            const maybeDirectoryWithIndexFileInside = path.join(
              currentDirectory,
              source.value,
              "index.js"
            );
            if (
              fs.existsSync(maybeDirectoryWithIndexFileInside) &&
              fs.statSync(maybeDirectoryWithIndexFileInside).isFile()
            ) {
              source.value = `${source.value}/index.js`;
              return;
            }
            astPath.remove();
            return;
          }
          let modulePath = path.resolve(modulesRootDirectory, source.value);
          if (!fs.existsSync(modulePath)) {
            modulePath = modulePath + ".js";
            if (!fs.existsSync(modulePath)) {
              return;
            }
          }
          if (fs.statSync(modulePath).isFile()) {
            source.value = modulePath.replace(process.cwd(), "");
            return;
          }
          const maybeDirectoryWithIndexFileInside = path.join(
            modulePath,
            "index.js"
          );
          if (
            fs.existsSync(maybeDirectoryWithIndexFileInside) &&
            fs.statSync(maybeDirectoryWithIndexFileInside).isFile()
          ) {
            source.value = maybeDirectoryWithIndexFileInside.replace(
              process.cwd(),
              ""
            );
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
          if (!/\.(js|mjs)$/.test(source.value)) {
            source.value = `${source.value}.js`;
          }
        }
      }
    };
  };
}

module.exports = esmResolverPluginFactory;
