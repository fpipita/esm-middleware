## [1.4.1](https://github.com/fpipita/esm-middleware/compare/v1.4.0...v1.4.1) (2019-11-08)

### Bug Fixes

- handle foo(exports) as a top level statement ([fadc539](https://github.com/fpipita/esm-middleware/commit/fadc539b5171017e255ef43d371027884497bdb8))

# [1.4.0](https://github.com/fpipita/esm-middleware/compare/v1.3.0...v1.4.0) (2019-11-04)

### Features

- enable local to public paths customization ([df41e88](https://github.com/fpipita/esm-middleware/commit/df41e881dc0527957fa2db4b115a73aee4cb1f8a))
- removeUnresolved - Allow not removing unresolved modules ([#7](https://github.com/fpipita/esm-middleware/issues/7)) ([7d507a8](https://github.com/fpipita/esm-middleware/commit/7d507a8cc70b8113cfbcf72805f68783929c88cb))

### Performance Improvements

- cache esm modules by content hash ([7c96198](https://github.com/fpipita/esm-middleware/commit/7c96198298dac9fd5a546be4a7fcd96fcb44ae03))

### BREAKING CHANGES

- Requesting a module located outside the `root` and `nodeModulesRoot` absolute paths
  is not supported anymore. This behavior was removed because it represented a security issue.

# [1.3.0](https://github.com/fpipita/esm-middleware/compare/v1.2.6...v1.3.0) (2019-10-27)

### Bug Fixes

- Windows regex error ([#2](https://github.com/fpipita/esm-middleware/issues/2)) ([8a9e013](https://github.com/fpipita/esm-middleware/commit/8a9e0132ac2f6326158e2dec6acf2dc556d3ba69))

### Features

- Allow specifying a root dir ([#5](https://github.com/fpipita/esm-middleware/issues/5)) ([08caabc](https://github.com/fpipita/esm-middleware/commit/08caabc6bc97048122342e383d1d32ef8cddd242))

## [1.2.6](https://github.com/fpipita/esm-middleware/compare/v1.2.5...v1.2.6) (2019-10-14)

### Bug Fixes

- handle more than one require() in a single variable declaration ([1884a2a](https://github.com/fpipita/esm-middleware/commit/1884a2a38633e212d32e93d341a78d9305d79470))

## [1.2.5](https://github.com/fpipita/esm-middleware/compare/v1.2.4...v1.2.5) (2019-10-14)

### Bug Fixes

- avoid early usage of imported bindings when not needed ([3b603f8](https://github.com/fpipita/esm-middleware/commit/3b603f831bde84a1c876d2bff4fdca2d6ce21545))

## [1.2.4](https://github.com/fpipita/esm-middleware/compare/v1.2.3...v1.2.4) (2019-10-14)

### Bug Fixes

- always expose node env when module.exports is overwritten ([1b98414](https://github.com/fpipita/esm-middleware/commit/1b98414bce1fbfd8d5fdd83bebb40ae37d7bca8d))

## [1.2.3](https://github.com/fpipita/esm-middleware/compare/v1.2.2...v1.2.3) (2019-10-14)

### Bug Fixes

- handle extension-less cjs module's main field ([48b401b](https://github.com/fpipita/esm-middleware/commit/48b401b3e7fb2ef45d27793b5e6c196cc110484f))

## [1.2.2](https://github.com/fpipita/esm-middleware/compare/v1.2.1...v1.2.2) (2019-10-13)

### Bug Fixes

- use req.originalUrl "as is" when it is an existing absolute path ([f907570](https://github.com/fpipita/esm-middleware/commit/f9075703f0bc3c127c4b442fc49a89e27af1869a))

## [1.2.1](https://github.com/fpipita/esm-middleware/compare/v1.2.0...v1.2.1) (2019-10-12)

### Bug Fixes

- use module.exports as default export ([db7a7c4](https://github.com/fpipita/esm-middleware/commit/db7a7c42cdb50444598042b1d7686c1deff1839e))

# [1.2.0](https://github.com/fpipita/esm-middleware/compare/v1.1.2...v1.2.0) (2019-10-12)

### Features

- handle modules exporting json files ([c6b99ca](https://github.com/fpipita/esm-middleware/commit/c6b99ca09f0315d9bae7b8c7b5257398b3f70983))

## [1.1.2](https://github.com/fpipita/esm-middleware/compare/v1.1.1...v1.1.2) (2019-10-12)

### Bug Fixes

- handle assignment to exports object ([d63946d](https://github.com/fpipita/esm-middleware/commit/d63946d840fccd6a1ef55e0b43d20b04816a399f))

## [1.1.1](https://github.com/fpipita/esm-middleware/compare/v1.1.0...v1.1.1) (2019-10-12)

### Bug Fixes

- handle assignment to property on module.exports ([83e3206](https://github.com/fpipita/esm-middleware/commit/83e320648328f68c21569670d48d91f5ff2ab9b9))

# [1.1.0](https://github.com/fpipita/esm-middleware/compare/v1.0.4...v1.1.0) (2019-10-12)

### Bug Fixes

- add support for dynamic import operator syntax. ([820420e](https://github.com/fpipita/esm-middleware/commit/820420ec00faf8184072dd71673a80df16ca2396))

### Features

- add support for require() calls. ([16ea60a](https://github.com/fpipita/esm-middleware/commit/16ea60ac44abfd5d16a540ff879451125534209e))
- add support for umd cjs named exports. ([22f6d03](https://github.com/fpipita/esm-middleware/commit/22f6d03bb2c4dffc159b02d43d37c3fa4b357899))

## [1.0.4](https://github.com/fpipita/esm-middleware/compare/v1.0.3...v1.0.4) (2019-05-01)

### Bug Fixes

- import mime from mime-types package. ([e86b713](https://github.com/fpipita/esm-middleware/commit/e86b7139ef7113bcdb6a711449f0816bb15609a1))

## [1.0.3](https://github.com/fpipita/esm-middleware/compare/v1.0.2...v1.0.3) (2019-05-01)

## [1.0.2](https://github.com/fpipita/esm-middleware/compare/v1.0.1...v1.0.2) (2018-09-16)

## [1.0.1](https://github.com/fpipita/esm-middleware/compare/2ae1d5f8ead0ca73a9ac96d975df2c35b24c4d78...v1.0.1) (2018-09-11)

### Features

- add first working implementation. ([2ae1d5f](https://github.com/fpipita/esm-middleware/commit/2ae1d5f8ead0ca73a9ac96d975df2c35b24c4d78))
