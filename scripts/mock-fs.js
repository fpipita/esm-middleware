const { join, parse } = require("path");

function createMockFs() {
  const _files = new Map();

  const fs = {
    readFileSync,
    existsSync,
    statSync,
    addFiles
  };

  return fs;

  function resolve(path) {
    return join(process.cwd(), path);
  }

  function findFile(
    path,
    found = () => {},
    notFound = path => {
      throw new Error(`${path}: file not found`);
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
    return findFile(path, () => true, () => false);
  }
  function statSync(path) {
    return findFile(path, entry => ({
      isFile: () => !entry.dir,
      isDirectory: () => entry.dir
    }));
  }
  function addFiles(...files) {
    files.forEach(({ path, content }) => {
      _files.set(resolve(path), content);
    });
    return fs;
  }
}

module.exports = createMockFs;
