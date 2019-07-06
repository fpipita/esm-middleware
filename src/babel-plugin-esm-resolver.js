const path = require("path");
const fs = require("fs");
const t = require("@babel/types");
const template = require("@babel/template").default;

// Babel plugin handbook https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
// ESTree AST reference https://github.com/babel/babylon/blob/master/ast/spec.md

const JS_FILE_PATTERN = /\.(js|mjs)$/;
const MODULE_SPECIFIER_PATTERN = /^[./]/;
const PATH_SEPARATOR_REPLACER = new RegExp(path.sep, "g");

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

function joinRelativePath(...paths) {
  const result = path.join(...paths);
  if (path.isAbsolute(result) || MODULE_SPECIFIER_PATTERN.test(result)) {
    return result;
  }
  return `.${path.sep}${result}`;
}

function resolveUserModule(source, currentModuleAbsolutePath) {
  const cwd = path.dirname(currentModuleAbsolutePath);
  const p = path.resolve(cwd, source);
  if (!fs.existsSync(p)) {
    if (!JS_FILE_PATTERN.test(p)) {
      return resolveUserModule(source + ".js", currentModuleAbsolutePath);
    }
    return null;
  }
  const stat = fs.statSync(p);
  if (stat.isFile()) {
    return source;
  }
  // if we get here, source is a directory, before to look for
  // package.json, let's check whether a module with the same
  // basename exists
  return (
    resolveUserModule(source + ".js", currentModuleAbsolutePath) ||
    resolveUserModule(
      joinRelativePath(source, "index.js"),
      currentModuleAbsolutePath
    )
  );
}

function resolveNodeModuleFromPackageJson(dir) {
  const p = path.resolve(dir, "package.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  const pj = JSON.parse(fs.readFileSync(p));
  const m = pj.module || pj["jsnext:main"] || pj.main;
  if (!m) {
    return null;
  }
  return path.resolve(dir, m);
}

function resolveNodeModule(source, nodeModulesRoot) {
  const p = path.resolve(nodeModulesRoot, source);
  if (!fs.existsSync(p)) {
    if (!JS_FILE_PATTERN.test(p)) {
      return resolveNodeModule(source + ".js", nodeModulesRoot);
    }
    return null;
  }
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    return (
      resolveNodeModuleFromPackageJson(p) ||
      resolveNodeModule(path.join(source, "index.js"), nodeModulesRoot)
    );
  }
  return p;
}

function resolveModule(source, nodeModulesRoot, currentModuleAbsolutePath) {
  if (MODULE_SPECIFIER_PATTERN.test(source)) {
    return resolveUserModule(source, currentModuleAbsolutePath);
  }
  const result = resolveNodeModule(source, nodeModulesRoot);
  if (result !== null) {
    return result.replace(process.cwd(), "");
  }
  return result;
}

function esmResolverPluginFactory({
  currentModuleAbsolutePath,
  nodeModulesRoot = path.resolve("node_modules")
} = {}) {
  return function() {
    return {
      visitor: {
        Program: {
          exit(p) {
            if (p.node.body.some(t.isModuleDeclaration)) {
              return;
            }
            p.unshiftContainer(
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
          exit(p) {
            const left = p.get("left");
            if (p.scope.parent !== null) {
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
            p.replaceWithMultiple(
              buildExportDefault({
                exportDefaultDeclaration: p.get("right").node
              })
            );
          }
        },
        CallExpression(p) {
          if (p.scope.parent !== null) {
            return;
          }
          if (!p.get("callee").isIdentifier({ name: "require" })) {
            return;
          }
          const program = p.findParent(path => path.isProgram());
          let importDeclaration;
          if (p.getStatementParent().get("expression") === p) {
            importDeclaration = buildImportWithNoBinding({
              importSpecifier: p.get("arguments.0").node
            });
            p.remove();
          } else {
            const binding = p.scope.generateUidIdentifier("require");
            importDeclaration = buildImportBindingFromDefault({
              binding,
              source: p.get("arguments.0").node
            });
            p.replaceWith(binding);
          }
          const lastImportStatement = findLastImportStatementPath(program);
          if (lastImportStatement) {
            lastImportStatement.insertAfter(importDeclaration);
          } else {
            program.unshiftContainer("body", importDeclaration);
          }
        },
        ModuleDeclaration(p) {
          if (!p.node.source) {
            return;
          }
          const source = resolveModule(
            p.node.source.value,
            nodeModulesRoot,
            currentModuleAbsolutePath
          );
          if (source === null || !JS_FILE_PATTERN.test(source)) {
            p.remove();
          } else {
            p.node.source.value = source.replace(PATH_SEPARATOR_REPLACER, "/");
          }
        }
      }
    };
  };
}

module.exports = esmResolverPluginFactory;
