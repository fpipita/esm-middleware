# esm-middleware [![Build Status](https://travis-ci.com/fpipita/esm-middleware.svg?branch=master)](https://travis-ci.com/fpipita/esm-middleware)

Serve ES modules from your `node_modules` folder.

## Overview

`esm-middleware` is an [Express middleware](http://expressjs.com/en/guide/writing-middleware.html) that aims to make it easy to deliver ES modules from the `node_modules` directory to the web browser, using the [ECMAScript 2015 import declaration syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import), which is currently available in all major browsers.

## Installation

```
yarn add esm-middleware
```

## Basic usage

On the server side, just create an `Express` app and attach the `esm-middleware`:

**server/server.js**

```javascript
const express = require("express");
const esm = require("esm-middleware");
const http = require("http");
const path = require("path");

const app = express();

// The esm middleware should be attached to the Express app before
// the static built-in middleware.
app.use(esm());

// Make the node_modules directory public.
app.use("/node_modules", express.static("node_modules"));

// Also, expose the directory where our client side code lives.
app.use("/client", express.static("client"));

app.get("*", (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <script type="module" src="/client/app.js"></script>
      </head>
      <body></body>
    </html>
  `);
});

const server = http.createServer(app);

server.listen(3000, () => console.log("Listening on port 3000"));
```

Let's now assume we wanted to use Lodash in our client side code, we first need to install it within our static `node_modules` folder:

```bash
npm install lodash
```

Then, in our client side code, we would just import Lodash as:

**client/app.js**

```javascript
import _ from "lodash";

// Use Lodash methods here...
```

## Public API

`esm-middleware` exports a factory function which takes a single options object argument:

| `{`               | Type      | Default value                  | Description                                                     |
| :---------------- | :-------- | :----------------------------- | :-------------------------------------------------------------- |
| `cache`           | `Boolean` | `true`                         | if `true`, modules are **cached**.                              |
| `nodeModulesRoot` | `String`  | `path.resolve("node_modules")` | it is an absolute path to the folder containing `npm` packages. |
| `}`               |           |                                |

Furthermore, the middleware implements a tiny web API which controls whether a certain module should be skipped from processing.

Just add a `nomodule=true` query string argument to the declaration source, e.g.:

```javascript
import foo from "some/polyfill.js?nomodule=true";
```

## How it works

Behind the scenes, `esm-middleware` uses a tiny Babel transform that rewrites ES import/export declaration sources so that they resolve to paths that are locally available to the web server and publicly accessible by the web browser.

Processed modules are parsed and transformed once. Subsequent requests are fullfilled by sending a cached version of each module.

Caching can be disabled by initializing the middleware with the `{ cache: false }` option.

## Known limitations

### CommonJS support

At the moment, `commonjs` modules are also supported but only the default export is made available to consumers (e.g. the value assigned to `module.exports`, similar to how `--experimental-modules` works in Node).

If a commonjs module has multiple named exports, you'll have to access them as properties of the default export, e.g.:

```javascript
import myModule from "myModule";

// Same as invoking module.exports.bar() on the server side.
myModule.bar();
```

In version `1.1.0`, basic support for UMD CommonJS named exports was added.
So, if the requested module is packaged as a `UMD` module, it will be possible to do:

```javascript
// let's pretend this is the file an hypothetical module named
// "umd-module" package json main's field points to
!(function(t) {
  t(exports);
})(function(e) {
  e.bar = "foo";
});

// in your source code, you can request "bar" by writing:
import { bar } from "umd-module";
console.log(bar);

// you can still use the default export though, it will always
// be made available for backward compatibility
import umdModule from "umd-module";
console.log(umdModule.bar);
```

### `<script>` tags

Any module loaded through a `<script>` tag, should be requested by specifing an extension for which the [`mime`](https://www.npmjs.com/package/mime) module returns a `MIME type` of `application/javascript`, e.g.

```javascript
...
// `app` is an Express application instance.
app.get("*", (res, req) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <!-- Here, the module should be explicitly loaded with the .js extension -->
        <script type="module" src="./my-module.js"></script>
      </head>
    </html>
  `)
})
```

If the extension is omitted, the middleware will not be able to process the module.

Extension can be omitted for modules requested through `import` or `export` declarations indeed.

### Node core modules

Node code modules are not supported at the moment, so doing something like:

```javascript
import EventEmitter from "events";
```

won't just work.

### TODO

- [ ] perf: cache modules by their content hash
- [ ] build: add conventional changelog
