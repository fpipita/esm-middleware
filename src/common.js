const SUPPORTED_MODULE_EXTENSIONS = ["js", "mjs", "json"];
const JS_FILE_PATTERN = new RegExp(
  `\\.(${SUPPORTED_MODULE_EXTENSIONS.join("|")})$`
);

/**
 * Inserts the given nodes after any `import` declarations already
 * present in the program body. If none of them is found, it inserts
 * the nodes first in the program's body.
 *
 * @param {babel.NodePath} path
 * @param {...babel.Node} nodes
 */
function hoist(path, ...nodes) {
  const program = /** @type {babel.NodePath<babel.types.Program>} */ (path.find(
    n => n.isProgram()
  ));
  const body = program.get("body").filter(n => n.isImportDeclaration());
  if (body.length > 0) {
    body[body.length - 1].insertAfter(nodes);
  } else {
    program.unshiftContainer("body", nodes);
  }
}

module.exports = {
  JS_FILE_PATTERN,
  SUPPORTED_MODULE_EXTENSIONS,
  hoist
};
