const express = require("express");
const esm = require("../index");
const path = require("path");

const app = express();
app.use(esm(path.resolve("client")));
app.use(express.static(path.resolve("client")));

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
