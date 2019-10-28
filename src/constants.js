const SUPPORTED_MODULE_EXTENSIONS = ["js", "mjs", "json"];
const JS_FILE_PATTERN = new RegExp(
  `\\.(${SUPPORTED_MODULE_EXTENSIONS.join("|")})$`
);

module.exports = {
  JS_FILE_PATTERN,
  SUPPORTED_MODULE_EXTENSIONS
};
