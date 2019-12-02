const t = require("@babel/types");
const { hoist } = require("./common");

/**
 * Maps Node globals to browser polyfill package names.
 */
const globals = new Map([["Buffer", "buffer"]]);

/**
 * ```diff
 * -var getLength = Buffer.byteLength.bind(Buffer);
 * +import { Buffer } from "buffer";
 * +var getLength = Buffer.byteLength.bind(Buffer);
 * ```
 * @type {import("./esm-middleware").EsmMiddlewareBabelPlugin}
 */
module.exports = () => ({
  visitor: {
    Program(path) {
      for (const [global, name] of globals) {
        if (path.scope.hasGlobal(global)) {
          const node = t.importDeclaration(
            [t.importSpecifier(t.identifier(global), t.identifier(global))],
            t.stringLiteral(name)
          );
          hoist(path, node);
        }
      }
    }
  }
});
