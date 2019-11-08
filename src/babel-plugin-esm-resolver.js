const path = require("path");
const t = require("@babel/types");
const { JS_FILE_PATTERN } = require("./constants");
const { resolveModule } = require("./resolve-module");

/**
 * Babel plugin handbook https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
 * ESTree AST reference https://github.com/babel/babylon/blob/master/ast/spec.md
 */

const PATH_SEPARATOR_REPLACER = /[/\\]+/g;

/**
 * @param {babel.types.Identifier} e
 * @returns {function}
 */
function toAssignmentExpressions(e) {
  return function fn(p) {
    if (p.isExpressionStatement()) {
      p = p.get("expression");
    }
    if (p.isSequenceExpression()) {
      const result = [];
      for (const exp of p.get("expressions")) {
        result.push(...fn(exp));
      }
      return result;
    }
    if (!p.isAssignmentExpression({ operator: "=" })) {
      return [];
    }
    const left = p.get("left");
    if (!left.isMemberExpression()) {
      return [];
    }
    const object = left.get("object");
    if (object.isIdentifier({ name: e.node.name })) {
      return [p];
    }
    return [];
  };
}

/**
 *
 * @param {babel.types.Identifier} p
 * @returns {Array.<babel.types.AssignmentExpression>} list of all assignment expressions like
 *  e.foo = 'bar' where `e` is a reference to the exports object.
 */
function findExportedBindings(p) {
  if (p.node.name !== "exports") {
    return [];
  }
  /**
   * we're looking for a call expression where exports
   * is one of the arguments, something like t(exports)
   */
  if (!p.inList || p.listKey !== "arguments") {
    return [];
  }
  const callee = p.parentPath.get("callee");
  if (!callee.isIdentifier()) {
    return [];
  }
  const pfe = p.findParent(t => t.isFunctionExpression());
  if (!pfe) {
    /**
     * the call expression involving `exports` as one of its arguments
     * happens as a top level statement, e.g.
     *
     * foo(exports);
     */
    return [];
  }
  const calleePosition = pfe.get("params").findIndex(p => {
    return p.isIdentifier() && p.node.name === callee.node.name;
  });
  if (calleePosition === -1) {
    return [];
  }
  const factoryCall = pfe.findParent(t => t.isCallExpression());
  if (!factoryCall) {
    return [];
  }
  const ffe = factoryCall.get("arguments." + calleePosition);
  /**
   * it's the identifier referencing the exports object
   * within the function expression where the exported bindings
   * are actually assigned to the exports object
   */
  const e = ffe.get("params." + p.key);
  if (!e) {
    return [];
  }
  /**
   * now we just need to look for all the assignment expressions
   * where the left node is a member expression having the `e`
   * identifier as the object node
   */
  return ffe
    .get("body")
    .get("body")
    .map(toAssignmentExpressions(e))
    .flat();
}

function findVariableDeclaration(p, name) {
  return p
    .find(p => p.isProgram())
    .get("body")
    .find(p => {
      if (!p.isVariableDeclaration()) {
        return false;
      }
      return p.get("declarations").find(p => {
        return p.get("id").isIdentifier({ name });
      });
    });
}

function addExportsVariableDeclarationIfNotPresent(p) {
  const program = p.findParent(p => p.isProgram());
  if (findVariableDeclaration(program, "module")) {
    return;
  }
  const modmembexp = t.memberExpression(
    t.identifier("module"),
    t.identifier("exports")
  );
  const expvdec = t.variableDeclarator(t.identifier("exports"), modmembexp);
  const expvadec = t.variableDeclaration("const", [expvdec]);
  program.unshiftContainer("body", expvadec);

  const expprop = t.objectProperty(
    t.identifier("exports"),
    t.objectExpression([])
  );
  const modvdec = t.variableDeclarator(
    t.identifier("module"),
    t.objectExpression([expprop])
  );
  const modvadec = t.variableDeclaration("const", [modvdec]);
  program.unshiftContainer("body", modvadec);
}

/**
 * @param {string} currentModuleAbsolutePath
 * @param {import("./esm-middleware").EsmMiddlewareConfigObject} config
 * @returns {babel.PluginItem}
 */
function babelPluginEsmResolverFactory(currentModuleAbsolutePath, config) {
  return function() {
    return {
      visitor: {
        Program: {
          exit(p) {
            const evd = findVariableDeclaration(p, "module");
            if (
              evd &&
              !p.get("body").find(p => p.isExportDefaultDeclaration())
            ) {
              const edd = t.exportDefaultDeclaration(
                t.memberExpression(
                  t.identifier("module"),
                  t.identifier("exports")
                )
              );
              p.pushContainer("body", edd);
            }
          }
        },
        Identifier(p) {
          const program = p.findParent(t => t.isProgram());
          const ae = findExportedBindings(p);
          for (let expr of ae) {
            // we make sure the exports binding is available on the root scope
            addExportsVariableDeclarationIfNotPresent(p);
            // turns exports.foo = 'bar' into export const foo = exports.foo;
            const e = t.identifier("exports");
            const pr = t.identifier(expr.get("left").get("property").node.name);
            const me = t.memberExpression(e, pr);
            if (pr.name === "default") {
              // add export default declaration if the named export's name is `default`
              const edd = t.exportDefaultDeclaration(me);
              program.pushContainer("body", edd);
              continue;
            }
            const vd = t.variableDeclarator(pr, me);
            const vad = t.variableDeclaration("const", [vd]);
            const es = t.exportSpecifier(pr, pr);
            const end = t.exportNamedDeclaration(vad, [es]);
            program.pushContainer("body", end);
          }
        },
        AssignmentExpression: {
          /**
           * @param {babel.NodePath} p
           */
          exit(p) {
            if (p.scope.parent !== null) {
              return;
            }
            const left = p.get("left");
            if (!left.isMemberExpression()) {
              return;
            }
            if (
              !left.get("object").isIdentifier({ name: "module" }) ||
              !left.get("property").isIdentifier({ name: "exports" })
            ) {
              return;
            }
            if (
              p.parentPath.isExpressionStatement() &&
              p.parentPath.get("expression") === p
            ) {
              /**
               * simple case where assignment to module.exports happens on a standalone
               * assignment expression, e.g.
               *
               *   module.exports = foo;
               *
               * we simply rewrite it as:
               *
               *   export default foo;
               */
              p.replaceWithMultiple(
                t.exportDefaultDeclaration(p.get("right").node)
              );
              return;
            }

            /**
             * module.exports assignment expression's is the right node of an
             * assignment expression itself, e.g.
             *
             *    var assert = foo = bar = module.exports = ok;
             *
             * we rewrite it as:
             *
             *    export default ok;
             *    var assert = foo = bar = ok;
             */
            const right = p.get("right");
            const edd = t.exportDefaultDeclaration(right.node);
            p.find(pp => pp.isProgram()).unshiftContainer("body", edd);
            p.replaceWith(right.node);
          }
        },
        /**
         * @param {babel.NodePath} p
         */
        CallExpression(p) {
          if (!p.get("callee").isIdentifier({ name: "require" })) {
            return;
          }
          if (p.parentPath.isVariableDeclarator()) {
            /**
             * the require() call is the init expression in a simple variable
             * declaration statement, something like
             *
             *     var x = require("./x"),
             *         y = require("./y");
             *
             * in this case, we simply replace each require call with an
             * import statement, e.g.
             *
             *     import x from "./x";
             *     import y from "./y"
             *
             */
            const idefspec = t.importDefaultSpecifier(
              p.parentPath.get("id").node
            );
            const idefdec = t.importDeclaration(
              [idefspec],
              p.get("arguments.0").node
            );
            p.findParent(p => p.isProgram()).unshiftContainer("body", idefdec);
            p.parentPath.remove();
            return;
          }
          if (p.getStatementParent().get("expression") === p) {
            /**
             * if we get here, we are on a standalone require call (the parent
             * statement is the require() call expression itself), e.g.
             *
             *    require("./foo");
             *
             * we simply replace it with an import default declaration
             * with no specifiers, e.g.
             *
             *    import "./foo";
             */
            const standalone = t.importDeclaration(
              [],
              p.get("arguments.0").node
            );
            p.remove();
            p.find(p => p.isProgram()).unshiftContainer("body", standalone);
            return;
          }
          /**
           * general way to process require() calls, it turns something like:
           *
           *    module.exports = require("bar");
           *
           * into
           *
           *    import _require from "bar";
           *    export default _require;
           *
           * that is, it replaces the require call with a unique identifier and
           * assigns the imported binding to it.
           *
           * TODO: this algorithm needs to be improved because it might cause
           * issues with cyclic dependencies.
           */
          const binding = p.scope.generateUidIdentifier("require");
          const ispec = t.importDefaultSpecifier(binding);
          const idec = t.importDeclaration([ispec], p.get("arguments.0").node);
          p.replaceWith(binding);
          p.find(p => p.isProgram()).unshiftContainer("body", idec);
        },
        ModuleDeclaration(p) {
          if (!p.node.source) {
            return;
          }
          const source = resolveModule(
            p.node.source.value,
            path.dirname(currentModuleAbsolutePath),
            config
          );
          if (source === null || !JS_FILE_PATTERN.test(source)) {
            if (config.removeUnresolved) {
              p.remove();
            }
          } else {
            p.node.source.value = source.replace(PATH_SEPARATOR_REPLACER, "/");
          }
        },
        MemberExpression(p) {
          if (
            p.get("object").isIdentifier({ name: "module" }) &&
            p.get("property").isIdentifier({ name: "exports" })
          ) {
            if (
              p.getFunctionParent() !== null ||
              !p.parentPath.isAssignmentExpression()
            ) {
              /**
               * if we get here, we assume two cases:
               *
               * 1. module.exports is being referenced by the function which
               *    checks the current environment and invokes the factory, e.g.
               *
               *      (function(global,factory){module.exports=factory()})(this,function(){});
               *
               *    this is a quite common pattern occurring in umd modules.
               *
               * 2. a property is being added to the module.exports object, e.g.
               *
               *      module.exports.foo = "bar";
               *
               * in both cases, we inject the module and exports bindings into the top
               * level scope
               */
              addExportsVariableDeclarationIfNotPresent(p);
            }
          }
          if (p.get("object").isIdentifier({ name: "exports" })) {
            addExportsVariableDeclarationIfNotPresent(p);
          }
        }
      }
    };
  };
}

module.exports = babelPluginEsmResolverFactory;
