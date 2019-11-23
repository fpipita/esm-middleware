const { parse } = require("path");

const fs = jest.genMockFromModule("fs");
const _files = new Map();

function findFile(
  path,
  found = () => {},
  notFound = path => {
    const error = new Error(`${path}: file not found`);
    error.code = "ENOENT";
    throw error;
  }
) {
  const content = _files.get(path);
  if (typeof content !== "undefined") {
    return found({ path, content });
  }
  const dir = [..._files.entries()].find(entry => {
    return parse(entry[0]).dir === path;
  });
  if (dir) {
    return found({ path, dir: true });
  }
  return notFound(path);
}

function readFileSync(path) {
  return findFile(path, file => file.content);
}

function existsSync(path) {
  return findFile(
    path,
    () => true,
    () => false
  );
}

function statSync(path) {
  return findFile(path, entry => ({
    isFile: () => !entry.dir,
    isDirectory: () => entry.dir
  }));
}

function __setFiles(...files) {
  _files.clear();
  files.forEach(({ path, content }) => {
    _files.set(path, content);
  });
  return fs;
}

module.exports = Object.assign(fs, {
  __setFiles,
  readFileSync,
  statSync,
  existsSync
});
