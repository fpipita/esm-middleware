# esm-middleware

Serve ES modules from your node_modules folder.

## Description

`esm-middleware` enables an Express server to deliver ES modules from the `node_modules` directory.

## Installation

```
yarn add esm-middleware
```

## Basic usage

```javascript
const express = require("express");
const esm = require("esm-middleware");
const http = require("http");
const path = require("path");

const app = express();

// In order for the middleware to work, the folder containing
// the npm packages should be made publicly accessible.
app.use("/node_modules", path.resolve("node_modules"));
app.use(esm());

const server = http.createServer(app);

server.listen(3000, () => console.log("Listening on port 3000"));
```

## Public API

`esm-middleware` exports a factory function which takes a single options object argument:

```javascript
{ cache: Boolean, modulesRootDirectory: String }
```

- `cache` (defaults to `true`) if `true`, modules are cached, this is suitable for production environments;
- `modulesRootDirectory` (defaults to `path.resolve("node_modules")`) it is an absolute path to the folder containing npm packages;

Furthermore, the middleware implements also a tiny web API which controls whether a certain module should be skipped from processing.

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
        <!-- Here, the module should explicitly loaded with the .js
        extension -->
        <script type="module" src="./my-module.js"></script>
      </head>
    </html>
  `)
})
```

If the extension is omitted, the middleware will not be able to process the module.

Extension can be omitted for modules requested through `import` or `export` declarations indeed.
