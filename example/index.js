const express = require("express");
const esm = require("@fpipita/esm-middleware");
const path = require("path");

const app = express();
/**
 * esm-middleware needs be loaded before any static middleware
 * in order for the module import specifiers to be processed
 */
app.use(esm());

app.use("/node_modules", express.static(path.resolve("node_modules")));
app.use("/client", express.static(path.resolve("client")));

app.get("*", (req, res) => {
  res.send(/* HTML */ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>esm-middleware example</title>
        <link rel="stylesheet" href="/client/app.css" />
        <script type="module" src="/client/app.js"></script>
      </head>
      <body></body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
