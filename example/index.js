const express = require("express");
const esm = require("../index");
const path = require("path");

const app = express();
/**
 * esm-middleware needs be loaded before any static middleware
 * in order for the module import specifiers to be processed
 */
app.use(esm({ root: path.resolve("client") }));

app.use("/node_modules", express.static(path.resolve("node_modules")));
app.use(express.static(path.resolve("client")));

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
