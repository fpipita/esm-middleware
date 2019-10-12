module.exports = {
  "*.js": ["eslint --fix", "git add"],
  "*.{md,json}": ["prettier --write", "git add"]
};
