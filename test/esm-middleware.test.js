const express = require("express");
const request = require("supertest");
const esm = require("../src/esm-middleware.js");
const FsMock = require("./fs-mock");

describe("middleware misc", () => {
  test("content-type", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: "import { createStore } from 'redux';",
          },
          {
            path: "/node_modules/redux/package.json",
            content: JSON.stringify({ module: "es/index.js" }),
          },
          {
            path: "/node_modules/redux/es/index.js",
            content: "export const createStore = () => {};",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toBe(200);
    expect(response.header["content-type"]).toMatchInlineSnapshot(
      '"application/javascript; charset=utf-8"'
    );
  });

  test("cache invalidation on file change", async () => {
    const fs = new FsMock(
      {
        path: "/client/app.js",
        content: 'import foo from "foo";',
      },
      {
        path: "/node_modules/foo/package.json",
        content: JSON.stringify({ "jsnext:main": "es/index.js" }),
      },
      {
        path: "/node_modules/foo/es/index.js",
        content: "export default 'foo';",
      }
    );
    const app = express();
    app.use(esm("/", { nodeModulesRoot: "/node_modules", _fs: fs }));
    await request(app).get("/client/app.js");

    fs._setFiles(
      {
        path: "/client/app.js",
        content: 'import bar from "bar";',
      },
      {
        path: "/node_modules/bar/package.json",
        content: JSON.stringify({ "jsnext:main": "es/index.js" }),
      },
      {
        path: "/node_modules/bar/es/index.js",
        content: "export default 'bar';",
      }
    );

    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import bar from \\"/node_modules/bar/es/index.js\\";"'
    );
  });

  test("unresolved modules", async () => {
    const app = express();
    app.use(esm("/", { nodeModulesRoot: "/node_modules", _fs: new FsMock() }));
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(404);
  });

  test("nomodule option", async () => {
    const app = express();
    app.use(esm("/", { nodeModulesRoot: "/node_modules" }));
    app.get("/client/app.js", (req, res) => {
      res.setHeader("Content-Type", "application/javascript");
      res.send(200, 'import foo from "foo";');
    });
    const response = await request(app).get("/client/app.js?nomodule=true");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot('"import foo from \\"foo\\";"');
  });
});

describe("import specifiers", () => {
  test("support for module key in package.json", async () => {
    const app = express();
    app.use(
      "/client",
      esm("/client", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "foo";',
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ module: "es/index.js" }),
          },
          {
            path: "/node_modules/foo/es/index.js",
            content: "export default 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/foo/es/index.js\\";"'
    );
  });

  test("support for jsnext:main key in package.json", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "foo";',
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ "jsnext:main": "es/index.js" }),
          },
          {
            path: "/node_modules/foo/es/index.js",
            content: "export default 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/foo/es/index.js\\";"'
    );
  });

  test("fine-grained import from package", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "@foo/foo.js";',
          },
          {
            path: "/node_modules/@foo/foo.js",
            content: "console.log('cool')",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/@foo/foo.js\\";"'
    );
  });

  test("export specifiers with no source", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "foo"; export { foo };',
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ module: "es/index.js" }),
          },
          {
            path: "/node_modules/foo/es/index.js",
            content: "export default 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(`
      "import foo from \\"/node_modules/foo/es/index.js\\";
      export { foo };"
    `);
  });

  test("extensionless node modules", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "@foo/foo";',
          },
          {
            path: "/node_modules/@foo/foo.js",
            content: "console.log('javascript is cool!')",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/@foo/foo.js\\";"'
    );
  });

  test("extensionless user modules", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "./foo";',
          },
          {
            path: "/client/foo.js",
            content: "console.log('javascript is cool!')",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"./foo.js\\";"'
    );
  });

  test("import directory", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "./foo";',
          },
          {
            path: "/client/foo/index.js",
            content: "export default 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"./foo/index.js\\";"'
    );
  });

  test("JavaScript modules have higher priority over directories", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "./foo";',
          },
          {
            path: "/client/foo/index.js",
            content: "export default 'foo';",
          },
          {
            path: "/client/foo.js",
            content: "export default 'bar';",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"./foo.js\\";"'
    );
  });

  test("export all declaration", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/index.js",
            content: "export * from './api'",
          },
          {
            path: "/api.js",
            content: "export const api = 'api';",
          }
        ),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot('"export * from \\"./api.js\\";"');
  });

  test("export named declaration", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/index.js",
            content: "export { api } from './api'",
          },
          {
            path: "/api.js",
            content: "export const api = 'api';",
          }
        ),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(
      '"export { api } from \\"./api.js\\";"'
    );
  });

  test("custom public patch access for source files", async () => {
    const app = express();
    app.use(
      esm("/app/src", {
        nodeModulesRoot: "/app/node_modules",
        rootPublicPath: "/app/src",
        _fs: new FsMock({
          path: "/app/src/app.js",
          content: "export default 'foo';",
        }),
      })
    );
    const res = await request(app).get("/app/src/app.js");
    expect(res.status).toEqual(200);
    expect(res.text).toMatchInlineSnapshot("\"export default 'foo';\"");
  });

  test("custom public path access for node_modules", async () => {
    const app = express();
    app.use(
      esm("/home/user/app/src", {
        nodeModulesRoot: "/home/user/app/node_modules",
        nodeModulesPublicPath: "/node_modules",
        _fs: new FsMock(
          {
            path: "/home/user/app/src/app.js",
            content: "import bar from 'bar'",
          },
          {
            path: "/home/user/app/node_modules/bar/index.js",
            content: "export default 'bar';",
          }
        ),
      })
    );
    const res = await request(app).get("/app.js");
    expect(res.status).toEqual(200);
    expect(res.text).toMatchInlineSnapshot(
      '"import bar from \\"/node_modules/bar/index.js\\";"'
    );
  });

  test("requested url relative `root` path", async () => {
    const app = express();
    app.use(
      esm("/app/src", {
        nodeModulesRoot: "/app/node_modules",
        _fs: new FsMock(
          {
            path: "/app/src/app.js",
            content: 'import foo from "foo";',
          },
          {
            path: "/app/node_modules/foo/package.json",
            content: JSON.stringify({ module: "es/index.js" }),
          },
          {
            path: "/app/node_modules/foo/es/index.js",
            content: "export default 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get("/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/foo/es/index.js\\";"'
    );
  });

  test("node_modules outside `root`", async () => {
    const app = express();
    app.use(
      esm("/app/src", {
        nodeModulesRoot: "/app/node_modules",
        _fs: new FsMock({
          path: "/app/node_modules/foo/dist/index.js",
          content: "export default 'foo';",
        }),
      })
    );
    const res = await request(app).get("/node_modules/foo/dist/index.js");
    expect(res.status).toEqual(200);
    expect(res.text).toMatchInlineSnapshot("\"export default 'foo';\"");
  });

  test("requested url not an allowed absolute path", async () => {
    const app = express();
    app.use(
      esm("/app/src", {
        nodeModulesRoot: "/app/node_modules",
        _fs: new FsMock(
          {
            path: "/app/src/app.js",
            content: "export default 'foo';",
          },
          {
            path: "/bar.js",
            content: "export default 'bar';",
          }
        ),
      })
    );
    const res = await request(app).get("/bar.js");
    expect(res.status).toEqual(404);
  });

  test("non JavaScript user modules are ignored by default", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: `
          import "./foo.less";
          import bar from "./bar";
        `,
          },
          {
            path: "/client/bar.js",
            content: "",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.text).toMatchInlineSnapshot(
      '"import bar from \\"./bar.js\\";"'
    );
  });

  test("non JavaScript node modules are ignored by default", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: `
          import 'animate.css';
          export default "bar";
        `,
          },
          {
            path: "/node_modules/animate.css/package.json",
            content: JSON.stringify({
              main: "./animate.css",
            }),
          },
          {
            path: "/node_modules/animate.css/animate.css",
            content: "#foo {}",
          }
        ),
      })
    );
    const response = await request(app).get("/client/app.js");
    expect(response.text).toMatchInlineSnapshot('"export default \\"bar\\";"');
  });

  test("non JavaScript modules are preserved when options.removeUnresolved is set to false", async () => {
    const app = express();
    app.use(
      esm("/my-app/src", {
        removeUnresolved: false,
        _fs: new FsMock({
          path: "/my-app/src/index.js",
          content: "import './bootstrap.css'",
        }),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.status).toEqual(200);
    expect(res.text).toMatchInlineSnapshot("\"import './bootstrap.css';\"");
  });

  test("cjs module whose main field points to an extension-less dest", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/app.js",
            content: "import foo from 'foo';",
          },
          {
            path: "/node_modules/foo/index.js",
            content: "module.exports = 'foo';",
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ main: "./index" }),
          }
        ),
      })
    );
    const r1 = await request(app).get("/app.js");
    expect(r1.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/foo/index.js\\";"'
    );
  });

  test("nodeModulesRoot !== nodeModulesPublicPath", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        nodeModulesPublicPath: "/foo",
        _fs: new FsMock(
          {
            path: "/index.js",
            content: `
              var getLength = Buffer.byteLength.bind(Buffer);
            `,
          },
          {
            path: "/node_modules/buffer/index.js",
            content: "module.exports = 'buffer';",
          }
        ),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(`
      "import { Buffer } from \\"/foo/buffer/index.js\\";
      var getLength = Buffer.byteLength.bind(Buffer);"
    `);
  });

  test("support for browser key in package.json (test case from fetch-mock)", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/app.js",
            content: 'import fetch from "fetch-mock";',
          },
          {
            path: "/node_modules/fetch-mock/package.json",
            content: JSON.stringify({
              main: "./cjs/server.js",
              browser: "./esm/client.mjs",
              module: "./esm/server.mjs",
            }),
          },
          {
            path: "/node_modules/fetch-mock/esm/client.mjs",
            content: "export default 'fetch-mock';",
          }
        ),
      })
    );
    const response = await request(app).get("/app.js");
    expect(response.status).toEqual(200);
    expect(response.text).toMatchInlineSnapshot(
      '"import fetch from \\"/node_modules/fetch-mock/esm/client.mjs\\";"'
    );
  });

  test("nomodule flag support", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/index.js",
            content: 'import "/foo.js?nomodule=true";',
          },
          {
            path: "/foo.js",
            content: `
          module.exports = "foo";
        `,
          }
        ),
      })
    );
    const response = await request(app).get("/index.js");
    expect(response.text).toMatchInlineSnapshot(
      '"import \\"/foo.js?nomodule=true\\";"'
    );
  });
});

describe("imports", () => {
  test("avoid early usage of imported bindings when not needed", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/x.js",
            content: "var y = require('./y'); module.exports = 'x';",
          },
          {
            path: "/y.js",
            content: "module.exports = 'y';",
          }
        ),
      })
    );
    const r1 = await request(app).get("/x.js");
    expect(r1.text).toMatchInlineSnapshot(`
      "import y from \\"./y.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = 'x';
      export default module.exports;"
    `);
  });

  test("variable declaration with more than one declarator", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/x.js",
            content: "var y = require('./y'), t = require('./t');",
          },
          {
            path: "/y.js",
            content: "module.exports = 'y';",
          },
          {
            path: "/t.js",
            content: "module.exports = 't';",
          }
        ),
      })
    );
    const r1 = await request(app).get("/x.js");
    expect(r1.text).toMatchInlineSnapshot(`
      "import y from \\"./y.js\\";
      import t from \\"./t.js\\";"
    `);
  });

  test("duplicate variable declarators (test case from jszip package)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/load.js",
            content: `
          var utils = require("./utils");
          var utils = require("./utils");
        `,
          },
          {
            path: "/utils.js",
            content: "module.exports = 'utils';",
          }
        ),
      })
    );
    const res = await request(app).get("/load.js");
    expect(res.text).toMatchInlineSnapshot(
      '"import utils from \\"./utils.js\\";"'
    );
  });

  test("use case from markdown-it", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/parse_link_destination.js",
            content: `
          var unescapeAll = require('./utils').unescapeAll;
        `,
          },
          {
            path: "/utils.js",
            content: "module.exports = 'utils';",
          }
        ),
      })
    );
    const res = await request(app).get("/parse_link_destination.js");
    expect(res.text).toMatchInlineSnapshot(`
      "import _require from \\"./utils.js\\";
      var unescapeAll = _require.unescapeAll;"
    `);
  });

  test("use case from markdown-it", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/parser_core.js",
            content: `
          var _rules = [['normalize', require('./normalize')]];
        `,
          },
          {
            path: "/normalize.js",
            content: "module.exports = 'normalize';",
          }
        ),
      })
    );
    const res = await request(app).get("/parser_core.js");
    expect(res.text).toMatchInlineSnapshot(`
      "import _require from \\"./normalize.js\\";
      var _rules = [['normalize', _require]];"
    `);
  });

  test("named imports", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock(
          {
            path: "/index.js",
            content: `
          const { foo, bar, defaults } = require("./helpers.js");
        `,
          },
          {
            path: "/helpers.js",
            content: `
          module.exports = {foo, bar, defaults: getDefaults()};
        `,
          }
        ),
      })
    );
    const r1 = await request(app).get("/index.js");
    expect(r1.text).toMatchInlineSnapshot(
      '"import { foo, bar, defaults } from \\"./helpers.js\\";"'
    );
    const r2 = await request(app).get("/helpers.js");
    expect(r2.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = {
        foo,
        bar,
        defaults: getDefaults()
      };
      export const defaults = module.exports.defaults;
      export { foo, bar };
      export default module.exports;"
    `);
  });
});

describe("default exports", () => {
  test("umd use case from package type-detect", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/app.js",
          content:
            "(function(global,factory){module.exports=factory()})(this,function(){});",
        }),
      })
    );
    const r1 = await request(app).get("/app.js");
    expect(r1.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;

      (function (global, factory) {
        module.exports = factory();
      })(this, function () {});

      export default module.exports;"
    `);
  });

  test("module.exports reference happens within a child scope (use case from package inherits)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/inherits_browser.js",
          content: `
        if (typeof Object.create === 'function') {
          module.exports = function inherits(ctor, superCtor) {
          };
        } else {
          module.exports = function inherits(ctor, superCtor) {
          };
        }
        `,
        }),
      })
    );
    const res = await request(app).get("/inherits_browser.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;

      if (typeof Object.create === 'function') {
        module.exports = function inherits(ctor, superCtor) {};
      } else {
        module.exports = function inherits(ctor, superCtor) {};
      }

      export default module.exports;"
    `);
  });

  test("standalone require() call expression", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/angular/index.js",
            content: `
            require('./angular');
            module.exports = angular;
          `,
          },
          {
            path: "/node_modules/angular/angular.js",
            content: "",
          }
        ),
      })
    );
    const response = await request(app).get("/node_modules/angular/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "import \\"./angular.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = angular;
      export default module.exports;"
    `);
  });

  test("handles exported literals", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/ui-bootstrap/index.js",
            content: `
            require('./ui-bootstrap.tpls.js');
            module.exports = "ui.bootstrap";
          `,
          },
          {
            path: "/node_modules/ui-bootstrap/ui-bootstrap.tpls.js",
            content: "module.exports = 'foo';",
          }
        ),
      })
    );
    const response = await request(app).get(
      "/node_modules/ui-bootstrap/index.js"
    );
    expect(response.text).toMatchInlineSnapshot(`
      "import './ui-bootstrap.tpls.js';
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = \\"ui.bootstrap\\";
      export default module.exports;"
    `);
  });

  test("handles module.exports = require(...)", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/foo/index.js",
            content: `
          module.exports = require("./bar");
        `,
          },
          {
            path: "/node_modules/foo/bar.js",
            content: "",
          }
        ),
      })
    );
    const response = await request(app).get("/node_modules/foo/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "import _require from \\"./bar.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = _require;
      export default module.exports;"
    `);
  });

  test("handles mixed module.exports = require(...) and spare require(...)", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/babel-runtime/core-js/object/keys.js",
            content: `
            require('../../modules/es6.object.keys');
            module.exports = require('../../modules/_core').Object.keys;
          `,
          },
          {
            path: "/node_modules/babel-runtime/modules/es6.object.keys.js",
            content: "",
          },
          {
            path: "/node_modules/babel-runtime/modules/_core/index.js",
            content: "",
          }
        ),
      })
    );
    const response = await request(app).get(
      "/node_modules/babel-runtime/core-js/object/keys.js"
    );
    expect(response.text).toMatchInlineSnapshot(`
      "import \\"../../modules/es6.object.keys.js\\";
      import _require from \\"../../modules/_core/index.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = _require.Object.keys;
      export default module.exports;"
    `);
  });

  test("handles require() from directory", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/babel-runtime/core-js/symbol.js",
            content: `
            module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
          `,
          },
          {
            path: "/node_modules/core-js/library/fn/symbol/index.js",
            content: "",
          }
        ),
      })
    );
    const response = await request(app).get(
      "/node_modules/babel-runtime/core-js/symbol.js"
    );
    expect(response.text).toMatchInlineSnapshot(`
      "import _require from \\"/node_modules/core-js/library/fn/symbol/index.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = {
        \\"default\\": _require,
        __esModule: true
      };
      export const __esModule = module.exports.__esModule;
      export default module.exports;"
    `);
  });

  test("modules exporting a json file", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/foo/index.js",
            content: "module.exports = require('./bar.json');",
          },
          {
            path: "/node_modules/foo/bar.json",
            content: JSON.stringify({ x: 1 }),
          }
        ),
      })
    );
    const r1 = await request(app).get("/node_modules/foo/index.js");
    expect(r1.text).toMatchInlineSnapshot(`
      "import _require from './bar.json';
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports = _require;
      export default module.exports;"
    `);
    const r2 = await request(app).get("/node_modules/foo/bar.json");
    expect(r2.text).toMatchInlineSnapshot('"export default {\\"x\\":1};"');
  });

  test("module.exports = foo not a standalone statement (use case from package assert)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/assert.js",
          content: "var assert = module.exports = ok;",
        }),
      })
    );
    const res = await request(app).get("/assert.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      var assert = module.exports = ok;
      export default module.exports;"
    `);
  });

  test("module.exports = foo is the right node of an assignment expression itself", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/assert.js",
          content: "var assert = foo = bar = module.exports = ok;",
        }),
      })
    );
    const res = await request(app).get("/assert.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      var assert = foo = bar = module.exports = ok;
      export default module.exports;"
    `);
  });

  test("use case from uuid (duplicate default export)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/uuid.js",
          content: `
            var _default = v4;
            exports.default = _default;
            module.exports = exports.default;
          `,
        }),
      })
    );
    const res = await request(app).get("/uuid.js");
    expect(res.text).toMatchInlineSnapshot(`
"const module = {
  exports: {}
};
const exports = module.exports;
var _default = v4;
exports.default = _default;
module.exports = exports.default;
export { _default as default };"
`);
  });
});

describe("named exports", () => {
  test("call expression involving `exports` as one of its arguments happening as a top level statement (test case from safe-buffer package)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/index.js",
          content: `
        copyProps(buffer, exports)
        exports.Buffer = SafeBuffer
      `,
        }),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
      export { SafeBuffer as Buffer };
      export default module.exports;"
    `);
  });

  test("assignment to a property on module.exports object", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/foo/index.js",
            content: "module.exports.encode = require('./encode');",
          },
          {
            path: "/node_modules/foo/encode.js",
            content: "module.exports = 1",
          }
        ),
      })
    );
    const response = await request(app).get("/node_modules/foo/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "import _require from \\"./encode.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports.encode = _require;
      export { _require as encode };
      export default module.exports;"
    `);
  });

  test("assignment to property on exports object", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/node_modules/foo/index.js",
            content: "exports.Any = require('./properties/Any/regex');",
          },
          {
            path: "/node_modules/foo/properties/Any/regex.js",
            content: "module.exports = 1",
          }
        ),
      })
    );
    const response = await request(app).get("/node_modules/foo/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "import _require from \\"./properties/Any/regex.js\\";
      const module = {
        exports: {}
      };
      const exports = module.exports;
      exports.Any = _require;
      export { _require as Any };
      export default module.exports;"
    `);
  });

  test("`export default exports` is always added when `exports` is referenced", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/client/index.js",
          content: `
          !function(t){t(exports)}(function(e){e.bar='foo'})
        `,
        }),
      })
    );
    const response = await request(app).get("/client/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      !function (t) {
        t(exports);
      }(function (e) {
        e.bar = 'foo';
      });
      export const bar = exports.bar;
      export default module.exports;"
    `);
  });

  test("property added to `module.exports`", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/assert.js",
          content: `
        module.exports.ok = ok;
      `,
        }),
      })
    );
    const res = await request(app).get("/assert.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      module.exports.ok = ok;
      export { ok };
      export default module.exports;"
    `);
  });

  test("indirect assignment to `module.exports`", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/client/app.js",
            content: 'import foo from "foo";',
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ main: "dist/index.js" }),
          },
          {
            path: "/node_modules/foo/dist/index.js",
            content:
              "!function(e,t){t(exports)}(this,function(e){e.foo='bar'});const x=1;",
          }
        ),
      })
    );
    const response1 = await request(app).get("/client/app.js");
    expect(response1.status).toEqual(200);
    expect(response1.text).toMatchInlineSnapshot(
      '"import foo from \\"/node_modules/foo/dist/index.js\\";"'
    );

    const response2 = await request(app).get("/node_modules/foo/dist/index.js");
    expect(response2.status).toEqual(200);
    expect(response2.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      !function (e, t) {
        t(exports);
      }(this, function (e) {
        e.foo = 'bar';
      });
      const x = 1;
      export const foo = exports.foo;
      export default module.exports;"
    `);
  });

  test("named exports", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/client/index.js",
          // export const bar = exports.bar;
          content: `
          !function(t){t(exports)}(function(e){e.bar='foo'})
        `,
        }),
      })
    );
    const response = await request(app).get("/client/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      !function (t) {
        t(exports);
      }(function (e) {
        e.bar = 'foo';
      });
      export const bar = exports.bar;
      export default module.exports;"
    `);
  });

  test("named exports wrapped within a sequence expression", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/client/index.js",
          // export const bar = exports.bar;
          content: `
      !(function(e, t) {
        "object" == typeof exports && "undefined" != typeof module
          ? t(exports)
          : "function" == typeof define && define.amd
          ? define(["exports"], t)
          : t((e.reduxLogger = e.reduxLogger || {}));
      })(this, function(e) {
        "use strict";

        (e.defaults = L),
          (e.createLogger = S),
          (e.logger = T),
          (e.default = T),
          Object.defineProperty(e, "__esModule", {
            value: !0
          });
      });
        `,
        }),
      })
    );
    const response = await request(app).get("/client/index.js");
    expect(response.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      !function (e, t) {
        \\"object\\" == typeof exports && \\"undefined\\" != typeof module ? t(exports) : \\"function\\" == typeof define && define.amd ? define([\\"exports\\"], t) : t(e.reduxLogger = e.reduxLogger || {});
      }(this, function (e) {
        \\"use strict\\";

        e.defaults = L, e.createLogger = S, e.logger = T, e.default = T, Object.defineProperty(e, \\"__esModule\\", {
          value: !0
        });
      });
      export const defaults = exports.defaults;
      export const createLogger = exports.createLogger;
      export const logger = exports.logger;
      export default exports.default;"
    `);
  });

  test("factory invocation through `Function.prototype.call`", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/app.js",
          content: `
        (function(exports, module, define) {
          var validate = function() {};
          exports.validate = validate;
        }).call(this, typeof exports !== 'undefined' ? exports : null);
    `,
        }),
      })
    );
    const r1 = await request(app).get("/app.js");
    expect(r1.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      (function (exports, module, define) {
        var validate = function () {};

        exports.validate = validate;
      }).call(this, typeof exports !== 'undefined' ? exports : null);
      export const validate = exports.validate;
      export default module.exports;"
    `);
  });

  test("property added to a binding referencing module.exports", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/assert.js",
          content: `
        var assert = module.exports = ok;
        assert.ok = ok;
      `,
        }),
      })
    );
    const res = await request(app).get("/assert.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      var assert = module.exports = ok;
      assert.ok = ok;
      export { ok };
      export default module.exports;"
    `);
  });

  test("property added to a binding referencing exports", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/assert.js",
          content: `
        var assert = exports;
        assert.ok = ok;
      `,
        }),
      })
    );
    const res = await request(app).get("/assert.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      var assert = exports;
      assert.ok = ok;
      export { ok };
      export default module.exports;"
    `);
  });

  test("top level indirect assignment to exports (test case from events package)", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/events.js",
          content: `
        function EventEmitter() {
          EventEmitter.init.call(this);
        }

        module.exports = EventEmitter; // Backwards-compat with node 0.10.x

        EventEmitter.EventEmitter = EventEmitter;
      `,
        }),
      })
    );
    const res = await request(app).get("/events.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;

      function EventEmitter() {
        EventEmitter.init.call(this);
      }

      module.exports = EventEmitter; // Backwards-compat with node 0.10.x

      EventEmitter.EventEmitter = EventEmitter;
      export { EventEmitter };
      export default module.exports;"
    `);
  });

  test("indirect reference happening at arbitrary depth", async () => {
    const app = express();
    app.use(
      esm("/", {
        _fs: new FsMock({
          path: "/index.js",
          content: `
        var foo = exports;
        var bar = foo;
        bar.ok = ok;
      `,
        }),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const module = {
        exports: {}
      };
      const exports = module.exports;
      var foo = exports;
      var bar = foo;
      bar.ok = ok;
      export { ok };
      export default module.exports;"
    `);
  });
});

describe("Node globals", () => {
  test("Buffer", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock(
          {
            path: "/index.js",
            content: `
          var getLength = Buffer.byteLength.bind(Buffer);
        `,
          },
          {
            path: "/node_modules/buffer/index.js",
            content: "module.exports = 'buffer';",
          }
        ),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(`
      "import { Buffer } from \\"/node_modules/buffer/index.js\\";
      var getLength = Buffer.byteLength.bind(Buffer);"
    `);
  });

  test("global", async () => {
    const app = express();
    app.use(
      esm("/", {
        nodeModulesRoot: "/node_modules",
        _fs: new FsMock({
          path: "/index.js",
          content: `
          global.foo = bar;
        `,
        }),
      })
    );
    const res = await request(app).get("/index.js");
    expect(res.text).toMatchInlineSnapshot(`
      "const global = {};
      global.foo = bar;"
    `);
  });
});
