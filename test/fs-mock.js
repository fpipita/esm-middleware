const { parse } = require("path");

class FsMock {
  constructor(...files) {
    this._files = new Map();
    this._setFiles(...files);
  }

  _setFiles(...files) {
    this._files.clear();
    files.forEach(({ path, content }) => {
      this._files.set(path, content);
    });
    return this;
  }

  _findFile(
    path,
    found = () => {},
    notFound = (path) => {
      const error = new Error(`${path}: file not found`);
      error.code = "ENOENT";
      throw error;
    }
  ) {
    const content = this._files.get(path);
    if (typeof content !== "undefined") {
      return found({ path, content });
    }
    const dir = [...this._files.entries()].find((entry) => {
      return parse(entry[0]).dir === path;
    });
    if (dir) {
      return found({ path, dir: true });
    }
    return notFound(path);
  }

  readFileSync(path) {
    return this._findFile(path, (file) => file.content);
  }

  existsSync(path) {
    return this._findFile(
      path,
      () => true,
      () => false
    );
  }

  statSync(path) {
    return this._findFile(path, (entry) => ({
      isFile: () => !entry.dir,
      isDirectory: () => entry.dir,
    }));
  }
}

module.exports = FsMock;
