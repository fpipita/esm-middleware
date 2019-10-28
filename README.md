# esm-middleware [![Build Status](https://travis-ci.com/fpipita/esm-middleware.svg?branch=master)](https://travis-ci.com/fpipita/esm-middleware)

Serve ES modules from your `node_modules` folder.

## Overview

`esm-middleware` is an [Express middleware](http://expressjs.com/en/guide/writing-middleware.html) that aims to make it easy to deliver ES modules from the `node_modules` directory to the web browser, using the [ECMAScript 2015 import declaration syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import), which is currently available in all major browsers.

## Installation

```
yarn add esm-middleware
```

## Usage

On the server side, create an `Express` app and mount the `esm-middleware`:

**server/server.js**

```javascript
const express = require("express");
const esm = require("esm-middleware");
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

- `root` **optional**, can either be an **absolute path** pointing to the folder containing your own code or an instance of the `EsmMiddlewareConfigObject`. It defaults to the **current working directory**;
- `options` **optional**, is an instance of the `EsmMiddlewareConfigObject` interface;

**esm-middleware type definitions**

`EsmMiddlewareOptions` and `EsmMiddlewareConfigObject` are defined as:

```typescript
type EsmMiddlewareOptions = string | EsmMiddlewareConfigObject;

interface EsmMiddlewareConfigObject {
  root?: string;
  nodeModulesRoot?: string;
  removeUnresolved?: boolean;
}
```

| `{`                | Type      | Default value                  | Description                                               |
| :----------------- | :-------- | :----------------------------- | :-------------------------------------------------------- |
| `root`             | `string`  | `path.resolve()`               | same as the `esmMiddlewareFactory`'s `root` parameter.    |
| `nodeModulesRoot`  | `string`  | `path.resolve("node_modules")` | absolute path to the folder containing `npm` packages.    |
| `removeUnresolved` | `boolean` | `true`                         | if `true`, modules that couldn't be resolved are removed. |
| `}`                |           |                                |

Furthermore, the middleware implements a tiny web API which controls whether a certain module should be skipped from processing.

Just add a `nomodule=true` query string argument to the declaration source, e.g.:

```javascript
import foo from "some/polyfill.js?nomodule=true";
```

## How it works

Behind the scenes, `esm-middleware` uses a tiny Babel transform that rewrites ES import/export declaration sources so that they resolve to paths that are locally available to the web server and publicly accessible by the web browser.

Processed modules are parsed and transformed once. Subsequent requests are fullfilled by sending a **cached** version of each module. The cache **gets invalidated** when files change.

## Known limitations

### CommonJS support

At the moment, `commonjs` modules are also supported but only the default export is made available to consumers (e.g. the value assigned to `module.exports`).

If a commonjs module has multiple named exports, you'll have to access them as properties of the default export, e.g.:

```javascript
import myModule from "myModule";

// Same as invoking module.exports.bar() on the server side.
myModule.bar();
```

In version `1.1.0`, basic support for UMD CommonJS named exports was added.
So, if the requested module is packaged as a `UMD` module, it will be possible to do:

**my-app/node_modules/umd-module/index.js**

```javascript
// let's pretend this is an hypothetical npm package's entry point
!(function(t) {
  t(exports);
})(function(e) {
  e.bar = "foo";
});
```

**my-app/src/app.js**

```javascript
// in your source code, you can now import "bar" as a named import:
import { bar } from "umd-module";

// you can still use the default export though, it will always
// be made available for backward compatibility
import umdModule from "umd-module";

// both will print the same thing
console.log(umdModule.bar === bar); // will print true
```

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

### Node core modules

Node code modules are not supported at the moment, so doing something like:

```javascript
import EventEmitter from "events";
```

won't just work.

## Contributing

Only a couple guidelines to follow for now:

- Make sure each change which updates the package's behavior comes with some tests demonstrating the updated behavior.
- Run the `yarn commit` script to commit your changes as it will help produce a propertly formatted commit message which is needed in order to be able to auto-generate a matching changelog entry.
- Always rebase your changes to the upstream's master branch before to create a pull request, so that we can avoid merge commits and keep the commit history cleaner.

## TODO

- [x] perf: cache modules by their content hash
- [x] build: add conventional changelog
- [ ] feat: support cjs named exports
- [ ] feat: preserve original code formatting where possible
- [x] build: switch to prettier-eslint
- [ ] feat: process script tags content
- [ ] docs: add typings
- [ ] chore: turn this todo list into GitHub issues
