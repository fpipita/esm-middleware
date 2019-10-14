jest.mock("fs");
const express = require("express");
const request = require("supertest");
const esm = require("../src/esm-middleware.js");
const fs = require("fs");

beforeEach(() => fs.__setFiles());

test("sets correct content-type", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: "import { createStore } from 'redux';"
    },
    {
      path: "/node_modules/redux/package.json",
      content: JSON.stringify({ module: "es/index.js" })
    }
  );
  const response = await request(express().use(esm())).get("/client/app.js");
  expect(response.status).toBe(200);
  expect(response.header["content-type"]).toBe(
    "application/javascript; charset=utf-8"
  );
});

test("supports `module` key in package.json", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "foo";'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ module: "es/index.js" })
    },
    {
      path: "/node_modules/foo/es/index.js",
      content: "export default 'foo';"
    }
  );
  const response = await request(express().use(esm())).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("supports `jsnext:main` key in package.json", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "foo";'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ "jsnext:main": "es/index.js" })
    },
    {
      path: "/node_modules/foo/es/index.js",
      content: "export default 'foo';"
    }
  );
  const response = await request(express().use(esm())).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("caches modules by default", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "foo";'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ "jsnext:main": "es/index.js" })
    },
    {
      path: "/node_modules/foo/es/index.js",
      content: "export default 'foo';"
    }
  );
  const app = express().use(esm());
  await request(app).get("/client/app.js");

  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import bar from "bar";'
    },
    {
      path: "/node_modules/bar/package.json",
      content: JSON.stringify({ "jsnext:main": "es/index.js" })
    }
  );

  const response = await request(app).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("delegates next middleware on unresolved module", async () => {
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.status).toEqual(404);
});

test("supports commonjs modules", async () => {
  fs.__setFiles(
    {
      path: "client/app.js",
      content: 'import foo from "foo";'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ main: "dist/index.js" })
    },
    {
      path: "/node_modules/foo/dist/index.js",
      content:
        "!function(e,t){t(exports)}(this,function(e){e.foo='bar'});const x=1;"
    }
  );
  const app = express().use(esm());
  const response1 = await request(app).get("/client/app.js");
  expect(response1.status).toEqual(200);
  expect(response1.text).toMatchSnapshot();

  const response2 = await request(app).get("/node_modules/foo/dist/index.js");
  expect(response2.status).toEqual(200);
  expect(response2.text).toMatchSnapshot();
});

test("supports fine-grained import from package", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "@foo/foo.js";'
    },
    {
      path: "/node_modules/@foo/foo.js",
      content: "console.log('cool')"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("skips module processing when ?nomodule=true", async () => {
  const app = express().use(esm());
  app.get("/client/app.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(200, 'import foo from "foo";');
  });
  const response = await request(app).get("/client/app.js?nomodule=true");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("doesn't crash on export specifiers with no source", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "foo"; export { foo };'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ module: "es/index.js" })
    },
    {
      path: "/node_modules/foo/es/index.js",
      content: "export default 'foo';"
    }
  );
  const response = await request(express().use(esm())).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("resolves modules without extension", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "@foo/foo";'
    },
    {
      path: "/node_modules/@foo/foo.js",
      content: "console.log('javascript is cool!')"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("resolves user modules with missing extension", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "./foo";'
    },
    {
      path: "/client/foo.js",
      content: "console.log('javascript is cool!')"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.status).toEqual(200);
  expect(response.text).toMatchSnapshot();
});

test("ignores non JavaScript modules by default", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: `
        import "./foo.less";
        import bar from "./bar";
      `
    },
    {
      path: "/client/bar.js",
      content: ""
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.text).toMatchSnapshot();
});

test("ignores node package exporting non-js code", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: `
        import 'animate.css';
        export default "bar";
      `
    },
    {
      path: "/node_modules/animate.css/package.json",
      content: JSON.stringify({
        main: "./animate.css"
      })
    },
    {
      path: "/node_modules/animate.css/animate.css",
      content: "#foo {}"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.text).toMatchSnapshot();
});

test("can import from directory with index.js file inside", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "./foo";'
    },
    {
      path: "/client/foo/index.js",
      content: "export default 'foo';"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.text).toMatchSnapshot();
});

test("prioritizes JavaScript modules over directories", async () => {
  fs.__setFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "./foo";'
    },
    {
      path: "/client/foo/index.js",
      content: "export default 'foo';"
    },
    {
      path: "/client/foo.js",
      content: "export default 'bar';"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/client/app.js");
  expect(response.text).toMatchSnapshot();
});

test("replaces top-level require() with import statement", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/angular/index.js",
      content: `
          require('./angular');
          module.exports = angular;
        `
    },
    {
      path: "/node_modules/angular/angular.js",
      content: ""
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/node_modules/angular/index.js");
  expect(response.text).toMatchSnapshot();
});

test("handles exported literals", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/ui-bootstrap/index.js",
      content: `
          require('./ui-bootstrap.tpls.js');
          module.exports = "ui.bootstrap";
        `
    },
    {
      path: "/node_modules/ui-bootstrap/ui-bootstrap.tpls.js",
      content: "module.exports = 'foo';"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get(
    "/node_modules/ui-bootstrap/index.js"
  );
  expect(response.text).toMatchSnapshot();
});

test("handles module.exports = require(...)", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/foo/index.js",
      content: `
        module.exports = require("./bar");
      `
    },
    {
      path: "/node_modules/foo/bar.js",
      content: ""
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/node_modules/foo/index.js");
  expect(response.text).toMatchSnapshot();
});

test("handles mixed module.exports = require(...) and spare require(...)", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/babel-runtime/core-js/object/keys.js",
      content: `
          require('../../modules/es6.object.keys');
          module.exports = require('../../modules/_core').Object.keys;
        `
    },
    {
      path: "/node_modules/babel-runtime/modules/es6.object.keys.js",
      content: ""
    },
    {
      path: "/node_modules/babel-runtime/modules/_core/index.js",
      content: ""
    }
  );
  const app = express().use(esm());
  const response = await request(app).get(
    "/node_modules/babel-runtime/core-js/object/keys.js"
  );
  expect(response.text).toMatchSnapshot();
});

test("handles require() from directory", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/babel-runtime/core-js/symbol.js",
      content: `
          module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
        `
    },
    {
      path: "/node_modules/core-js/library/fn/symbol/index.js",
      content: ""
    }
  );
  const app = express().use(esm());
  const response = await request(app).get(
    "/node_modules/babel-runtime/core-js/symbol.js"
  );
  expect(response.text).toMatchSnapshot();
});

test("supports named exports", async () => {
  fs.__setFiles({
    path: "/client/index.js",
    // export const bar = exports.bar;
    content: `
        !function(t){t(exports)}(function(e){e.bar='foo'})
      `
  });
  const app = express().use(esm());
  const response = await request(app).get("/client/index.js");
  expect(response.text).toMatchSnapshot();
});

test("supports named exports wrapped within a sequence expression", async () => {
  fs.__setFiles({
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
      `
  });
  const app = express().use(esm());
  const response = await request(app).get("/client/index.js");
  expect(response.text).toMatchSnapshot();
});

test("always adds export default exports when exports is referenced", async () => {
  fs.__setFiles({
    path: "/client/index.js",
    // export const bar = exports.bar;
    content: `
        !function(t){t(exports)}(function(e){e.bar='foo'})
      `
  });
  const app = express().use(esm());
  const response = await request(app).get("/client/index.js");
  expect(response.text).toMatchSnapshot();
});

test("assignment to a property on module.exports object", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/foo/index.js",
      content: "module.exports.encode = require('./encode');"
    },
    {
      path: "/node_modules/foo/encode.js",
      content: "module.exports = 1"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/node_modules/foo/index.js");
  expect(response.text).toMatchSnapshot();
});

test("assignment to property on exports object", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/foo/index.js",
      content: "exports.Any = require('./properties/Any/regex');"
    },
    {
      path: "/node_modules/foo/properties/Any/regex.js",
      content: "module.exports = 1"
    }
  );
  const app = express().use(esm());
  const response = await request(app).get("/node_modules/foo/index.js");
  expect(response.text).toMatchSnapshot();
});

test("modules exporting a json file", async () => {
  fs.__setFiles(
    {
      path: "/node_modules/foo/index.js",
      content: "module.exports = require('./bar.json');"
    },
    {
      path: "/node_modules/foo/bar.json",
      content: JSON.stringify({ x: 1 })
    }
  );
  const app = express().use(esm());
  const r1 = await request(app).get("/node_modules/foo/index.js");
  expect(r1.text).toMatchSnapshot();
  const r2 = await request(app).get("/node_modules/foo/bar.json");
  expect(r2.text).toMatchSnapshot();
});

test("cjs module whose main field points to an extension-less dest", async () => {
  fs.__setFiles(
    {
      path: "/app.js",
      content: "import foo from 'foo';"
    },
    {
      path: "/node_modules/foo/index.js",
      content: "module.exports = 'foo';"
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ main: "./index" })
    }
  );
  const app = express().use(esm());
  const r1 = await request(app).get("/app.js");
  expect(r1.text).toMatchSnapshot();
});

test("yet another (simplified) umd use case from package type-detect", async () => {
  fs.__setFiles({
    path: "/app.js",
    content:
      "(function(global,factory){module.exports=factory()})(this,function(){});"
  });
  const app = express().use(esm());
  const r1 = await request(app).get("/app.js");
  expect(r1.text).toMatchSnapshot();
});
