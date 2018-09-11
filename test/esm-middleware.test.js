const express = require("express");
const request = require("supertest");
const esm = require("../src/esm-middleware.js");
const createMockFs = require("../scripts/mock-fs.js");

test("sets correct content-type", async () => {
  return request(
    express().use(
      esm({
        fs: createMockFs().addFiles(
          {
            path: "/client/app.js",
            content: "import { createStore } from 'redux';"
          },
          {
            path: "/node_modules/redux/package.json",
            content: JSON.stringify({ module: "es/index.js" })
          }
        )
      })
    )
  )
    .get("/client/app.js")
    .expect(200)
    .expect("Content-Type", "application/javascript; charset=utf-8");
});

test("supports `module` key in package.json", async () => {
  return request(
    express().use(
      esm({
        fs: createMockFs().addFiles(
          {
            path: "/client/app.js",
            content: 'import foo from "foo";'
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ module: "es/index.js" })
          }
        )
      })
    )
  )
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/foo/es/index.js";');
});

test("supports `jsnext:main` key in package.json", async () => {
  return request(
    express().use(
      esm({
        fs: createMockFs().addFiles(
          {
            path: "/client/app.js",
            content: 'import foo from "foo";'
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ "jsnext:main": "es/index.js" })
          }
        )
      })
    )
  )
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/foo/es/index.js";');
});

test("caches modules by default", async () => {
  const fs = createMockFs().addFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "foo";'
    },
    {
      path: "/node_modules/foo/package.json",
      content: JSON.stringify({ "jsnext:main": "es/index.js" })
    }
  );
  const app = express().use(esm({ fs }));
  await request(app).get("/client/app.js");

  fs.addFiles(
    {
      path: "/client/app.js",
      content: 'import bar from "bar";'
    },
    {
      path: "/node_modules/bar/package.json",
      content: JSON.stringify({ "jsnext:main": "es/index.js" })
    }
  );

  return request(app)
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/foo/es/index.js";');
});

test("delegates next middleware on unresolved module", async () => {
  const app = express().use(esm({ fs: createMockFs() }));
  return await request(app)
    .get("/client/app.js")
    .expect(404);
});

test("supports commonjs modules", async () => {
  const fs = createMockFs().addFiles(
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
        "!function(e, t){t(exports)}(this, function(e){e.foo = 'bar'});const x = 1;"
    }
  );
  const app = express().use(esm({ fs }));
  await request(app)
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/foo/dist/index.js";');

  return request(app)
    .get("/node_modules/foo/dist/index.js")
    .expect(
      200,
      "const module = {\n  \"exports\": {}\n};\nconst exports = module.exports;\nexport default module.exports;\n!function (e, t) {\n  t(exports);\n}(this, function (e) {\n  e.foo = 'bar';\n});\nconst x = 1;"
    );
});

test("supports fine-grained import from package", async () => {
  const fs = createMockFs().addFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "@foo/foo.js";'
    },
    {
      path: "/node_modules/@foo/foo.js",
      content: "console.log('cool')"
    }
  );
  const app = express().use(esm({ fs }));
  return request(app)
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/@foo/foo.js";');
});

test("skips module processing when ?nomodule=true", async () => {
  const fs = {};
  const app = express().use(esm({ fs }));
  app.get("/client/app.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(200, 'import foo from "foo";');
  });
  return request(app)
    .get("/client/app.js?nomodule=true")
    .expect(200, 'import foo from "foo";');
});

test("doesn't crash on export specifiers with no source", async () => {
  return request(
    express().use(
      esm({
        fs: createMockFs().addFiles(
          {
            path: "/client/app.js",
            content: 'import foo from "foo"; export { foo };'
          },
          {
            path: "/node_modules/foo/package.json",
            content: JSON.stringify({ module: "es/index.js" })
          }
        )
      })
    )
  )
    .get("/client/app.js")
    .expect(
      200,
      'import foo from "/node_modules/foo/es/index.js";\nexport { foo };'
    );
});

test("resolves modules without extension", async () => {
  const fs = createMockFs().addFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "@foo/foo";'
    },
    {
      path: "/node_modules/@foo/foo.js",
      content: "console.log('javascript is cool!')"
    }
  );
  const app = express().use(esm({ fs }));
  return request(app)
    .get("/client/app.js")
    .expect(200, 'import foo from "/node_modules/@foo/foo.js";');
});

test("resolves user modules with missing extension", async () => {
  const fs = createMockFs().addFiles(
    {
      path: "/client/app.js",
      content: 'import foo from "./foo";'
    },
    {
      path: "/client/foo.js",
      content: "console.log('javascript is cool!')"
    }
  );
  const app = express().use(esm({ fs }));
  return request(app)
    .get("/client/app.js")
    .expect(200, 'import foo from "./foo.js";');
});
