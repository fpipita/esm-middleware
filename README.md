# esm-middleware [![Build Status](https://travis-ci.com/fpipita/esm-middleware.svg?branch=master)](https://travis-ci.com/fpipita/esm-middleware)

Serve ES modules from your `node_modules` folder.

## Overview

`esm-middleware` is an [Express middleware](http://expressjs.com/en/guide/writing-middleware.html) that aims to make it easy to deliver ES modules from the `node_modules` directory to the web browser, using the [ECMAScript 2015 import declaration syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import), which is currently available in all major browsers.

## Installation

```
yarn add @fpipita/esm-middleware
```

## Usage

On the server side, create an `Express` app and mount the `esm-middleware`:

**server/server.js**

```javascript
const express = require("express");
const esm = require("@fpipita/esm-middleware");
const path = require("path");

const app = express();

// The esm middleware should be attached to the Express app before
// the static built-in middleware. It takes an absolute path to the
// directory where your esm modules are located.
app.use(esm(path.resolve("client")));
app.use(express.static(path.resolve("client")));

app.get("*", (req, res) => {
  res.send(/* HTML */ `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="app.css" />
        <script type="module" src="app.js"></script>
      </head>
      <body></body>
    </html>
  `);
});

app.listen(3000, () => console.log("Listening on port 3000"));
```

Let's now assume we wanted to use Lodash in our client side code, we first need to install it within our static `node_modules` folder:

```bash
user@localhost:~$ yarn add lodash
```

Then, in our client side code, we would just import Lodash as:

**client/app.js**

```javascript
import _ from "lodash";

// Use Lodash methods here...
```

You can find a minimal working example in the `example` directory.
After installing the example dependencies, you can run it with:

```bash
user@localhost:~$ yarn start
```

and point your browser to `http://localhost:3000/`.

## Public API

`esm-middleware` exports a factory function with the following signature:

```typescript
function esmMiddlewareFactory(
  root?: EsmMiddlewareOptions,
  options?: EsmMiddlewareConfigObject
): express.Handler;
```

where:

- `root` **optional**, can either be an **absolute path** pointing to the folder containing your own code or an instance of the `EsmMiddlewareConfigObject` interface. It defaults to the **current working directory**;
- `options` **optional**, is an instance of the `EsmMiddlewareConfigObject` interface;

**esm-middleware type definitions**

`EsmMiddlewareOptions` and `EsmMiddlewareConfigObject` are defined as:

```typescript
type EsmMiddlewareOptions = string | EsmMiddlewareConfigObject;

interface EsmMiddlewareConfigObject {
  root?: string;
  rootPublicPath?: string;
  nodeModulesRoot?: string;
  nodeModulesPublicPath?: string;
  removeUnresolved?: boolean;
  disableCaching?: boolean;
}
```

| `{`                     | Type      | Default value                  | Description                                                                 |
| :---------------------- | :-------- | :----------------------------- | :-------------------------------------------------------------------------- |
| `root`                  | `string`  | `path.resolve()`               | same as the `esmMiddlewareFactory`'s `root` parameter.                      |
| `rootPublicPath`        | `string`  | `/`                            | specifies the public url at which source code will be mounted.              |
| `nodeModulesRoot`       | `string`  | `path.resolve("node_modules")` | absolute path to the folder containing `npm` packages.                      |
| `nodeModulesPublicPath` | `string`  | `/node_modules`                | specifies the public url at which `node_modules` will be mounted.           |
| `removeUnresolved`      | `boolean` | `true`                         | if `true`, modules that couldn't be resolved are removed.                   |
| `disableCaching`        | `boolean` | `false`                        | if `true`, caching will be disabled and modules recompiled on each request. |
| `}`                     |           |                                |

Furthermore, the middleware implements a tiny web API which controls whether a certain module should be skipped from processing.

Just add a `nomodule=true` query string argument to the declaration source, e.g.:

```javascript
import foo from "some/polyfill.js?nomodule=true";
```

## How it works

Behind the scenes, `esm-middleware` runs a couple [Babel](https://babeljs.io/) transforms that:

1. Rewrite ES module specifiers so that they resolve to paths that are locally available to the web server and publicly accessible by the web browser;
2. Convert CommonJS module exports to ESM export declarations;
3. Convert CommonJS `require()` calls to ESM import declarations;

Processed modules are parsed and transformed once. Subsequent requests are fullfilled by sending a **cached** version of each module. The cache **gets invalidated** on files change.

## CommonJS to ESM supported patterns

The following sections show some of the CommonJS patterns that are recognized by the middleware and the way they are turned into their ESM equivalents.

### require() to ESM import declaration

#### standalone require() call

```diff
-require("foo");
+import "foo";
```

#### require() call happening in assignment expression

```diff
-module.exports.foo = require("bar")
+import _require from "bar";
+module.exports.foo = _require;
```

#### require() call as the object node in a member expression

```diff
-var foo = require("bar").foo;
+import _require from "bar";
+var foo = _require.foo;
```

#### require() call happening in a variable declarator

```diff
-const y = require("./y"), t = require("./t");
+import y from "./y";
+import t from "./t";
```

### CommonJS exports to ESM export declarations

#### assignment to module.exports

```diff
-module.exports = foo;
+const module = { exports: {} };
+const exports = module.exports;
+module.exports = foo;
+export default module.exports;
```

#### assignment to exports

```diff
-exports = foo;
+const module = { exports: {} };
+const exports = module.exports;
+module.exports = foo;
+export default module.exports;
```

#### direct named export

```diff
-module.exports.bar = foo;
+const module = { exports: {} };
+const exports = module.exports;
+module.exports.bar = foo;
+export { foo as bar };
+export default module.exports;
```

#### indirect named export

```diff
-var foo = module.exports = bar;
-foo.bar = bar;
+const module = { exports: {} };
+const exports = module.exports;
+var foo = module.exports = bar;
+foo.bar = bar;
+export { bar };
+export default module.exports;
```

#### named export through factory (pattern #1)

```diff
-(function(e){e.bar='foo'}).call(this, exports)
+const module = { exports: {} };
+const exports = module.exports;
+(function(e){e.bar='foo'}).call(this, exports)
+export const bar = exports.bar
+export default module.exports;
```

#### named export through factory (pattern #2)

```diff
-!function(t){t(exports)}(function(e){e.bar='foo'})
+const module = { exports: {} };
+const exports = module.exports;
+!function(t){t(exports)}(function(e){e.bar='foo'})
+export const bar = exports.bar;
+export default module.exports;
```

## Node globals

Node globals support relies on the libraries listed in the `node-libs-browser` package, which has to be provided as a **peer dependency** to `esm-middleware`.

When a Node global is referenced, `esm-middleware` automatically injects an ESM import declaration for the referenced global into the module scope.

At the moment, the only recognized global is `Buffer`, which is provided through the `buffer` package:

```diff
-var getLength = Buffer.byteLength.bind(Buffer);
+import { Buffer } from "buffer";
+var getLength = Buffer.byteLength.bind(Buffer);
```

The Node `global` global is also **automatically injected** in the module scope if it is referenced.

### Node core modules

Support for Node core modules works in a similar way to Node globals.

It basically relies on the existence of a browser implementation of the requested module.

If the browser implementation exists, all you need to do is to list it among your package dependencies.

For example, if your package depends on the `events` module,

```javascript
import { EventEmitter } from "events";
```

all you need to do to make it work with `esm-middleware` is:

```bash
user@localhost:~$ yarn add events
```

## Known limitations

### `<script>` tags

Code within `script` tags will not be processed by the middleware, don't do this:

**client/index-bad.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- this will result in a browser error because "foo" is not a valid module specifier -->
    <script type="module">
      import foo from "foo";
    </script>
  </head>
</html>
```

do this instead:

**client/index-good.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module" src="./my-app.js"></script>
  </head>
</html>
```

**client/my-app.js**

```javascript
import foo from "foo";
```

that is, make sure your app's entry point gets loaded through the `src` attribute of a `script` tag.

## Contributing

Only a couple guidelines to follow for now:

- Make sure each change which updates the package's behavior comes with some tests demonstrating the updated behavior.
- Run the `yarn commit` script to commit your changes as it will help produce a propertly formatted commit message which is needed in order to be able to auto-generate a matching changelog entry.
- Always rebase your changes to the upstream's master branch before to create a pull request, so that we can avoid merge commits and keep the commit history cleaner.
