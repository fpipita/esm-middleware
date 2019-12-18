const t = require("@babel/types");
const { hoist } = require("./helpers");

/**
 * Maps Node globals to browser polyfill package names.
 */
const polyfills = new Map([["Buffer", "buffer"]]);

/**
 * This plugin injects Node globals into the browser environment.
 *
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
      for (const global of Object.keys(path.scope.globals)) {
        if (global === "global") {
          const node = t.variableDeclaration("const", [
            t.variableDeclarator(t.identifier("global"), t.objectExpression([]))
          ]);
          hoist(path, node);
        } else {
          const polyfill = polyfills.get(global);
          if (typeof polyfill !== "undefined") {
            const node = t.importDeclaration(
              [t.importSpecifier(t.identifier(global), t.identifier(global))],
              t.stringLiteral(polyfill)
            );
            hoist(path, node);
          }
        }
      }
    }
  }
});
