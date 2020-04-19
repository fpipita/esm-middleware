/**
 * @param {babel.NodePath} path
 * @returns {boolean} `true` if `path` is a direct or indirect
 * reference to `exports`, e.g.
 *
 * ```javascript
 * // `exports` is an `exports` direct reference
 * exports.foo = 'bar';
 *
 * // assert and ok are references to `exports`
 * var assert = module.exports = ok;
 *
 * // `foo` is an indirect reference to `exports`
 * module.exports = foo;
 * ```
 */
export function isExportsBinding(path: babel.NodePath<babel.types.Node>): boolean;
/**
 * Inserts the given nodes after any `import` declarations already
 * present in the program body. If none of them is found, it inserts
 * the nodes first in the program's body.
 *
 * @param {babel.NodePath} path
 * @param {...babel.Node} nodes
 */
export function hoist(path: babel.NodePath<babel.types.Node>, ...nodes: babel.types.Node[]): void;
export const SUPPORTED_MODULE_EXTENSIONS: string[];
export const JS_FILE_PATTERN: RegExp;
