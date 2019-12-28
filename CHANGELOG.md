# [1.5.0](https://github.com/fpipita/esm-middleware/compare/v1.4.4...v1.5.0) (2019-12-28)

### Bug Fixes

- handle arbitrary depth indirect assignments ([62cbded](https://github.com/fpipita/esm-middleware/commit/62cbded423e2f8c0bacf9a083d72ea0c23576fd8))
- handle export named/all declaration ([b8893ac](https://github.com/fpipita/esm-middleware/commit/b8893acf12f211ad019ebb7e688d0fe2a3b8a288))
- handle module.exports reference happening on child scope ([c57230a](https://github.com/fpipita/esm-middleware/commit/c57230aaad63de9e7171db62d0b9256f9b58a966))
- handle nodeModulesRoot !== nodeModulesPublicPath case ([25f53a6](https://github.com/fpipita/esm-middleware/commit/25f53a63d67924eed100b675d41fa8f52212a171))
- handle one more named export use case ([9fdf470](https://github.com/fpipita/esm-middleware/commit/9fdf4703fc0f72779e01d8d31abe8e80fb14de00))
- handle require() call as object in member expression ([e42130e](https://github.com/fpipita/esm-middleware/commit/e42130e13de81534a0496d6056ebb2a2a6127a58))
- handle require() call happening in a generic expression ([410f95c](https://github.com/fpipita/esm-middleware/commit/410f95c48c0648d7702c82a85224a329e006fb9f))
- make ?nomodule=true work in module sources ([3b06659](https://github.com/fpipita/esm-middleware/commit/3b066594130b7af47ae2dab1c2d5a5806b13bf41))
- **docs:** add link to Babel homepage ([9a6e8f2](https://github.com/fpipita/esm-middleware/commit/9a6e8f293720beab897591133de868ffd1d6bdbd))

### Features

- add disableCaching flag ([b816fbc](https://github.com/fpipita/esm-middleware/commit/b816fbc01732553aa93ba4fec3fe5cacf49c56c4))
- add support for browser key in package.json ([8955cb1](https://github.com/fpipita/esm-middleware/commit/8955cb152e8e98482ede5a0cd367675edfd8316c))
- add support for Node globals ([1c6273a](https://github.com/fpipita/esm-middleware/commit/1c6273ac5c3317fbc230ab18d83e8ad1aaceeae8))
- handle indirect top level assignment to exports ([4a3b2b2](https://github.com/fpipita/esm-middleware/commit/4a3b2b2fa9e49092421626b2dc10caa810d7a611))
- improve support for named imports and exports ([b76e66b](https://github.com/fpipita/esm-middleware/commit/b76e66bf5658f31b17e308dacd7af75eed7af4e8))
- improved named exports support ([48298df](https://github.com/fpipita/esm-middleware/commit/48298df149b02b72e5879facfc275d3e4a02bc7a))
- inject Node `global` global ([606c56e](https://github.com/fpipita/esm-middleware/commit/606c56e198b92d7429d28857b6b908705ed06a2a))
- named exports through Function.prototype.call invoked factory ([c9492a4](https://github.com/fpipita/esm-middleware/commit/c9492a4d11e17f463822a0fd4fa7e89e05155922))

## [1.4.4](https://github.com/fpipita/esm-middleware/compare/v1.4.3...v1.4.4) (2019-11-08)

### Features

- remove duplicate variable declarators ([49640ed](https://github.com/fpipita/esm-middleware/commit/49640ed417cbd9e9fdb60d0a2232f46bfbf6dd2f))

## [1.4.3](https://github.com/fpipita/esm-middleware/compare/v1.4.2...v1.4.3) (2019-11-08)

### Bug Fixes

- handle module.exports = foo part of a generic parent expression ([90af3cc](https://github.com/fpipita/esm-middleware/commit/90af3cc3fcb433147f706e01f6154d06bde22011))

## [1.4.2](https://github.com/fpipita/esm-middleware/compare/v1.4.1...v1.4.2) (2019-11-08)

### Bug Fixes

- handle module.exports = foo right side of parent assignment expression ([e0465bb](https://github.com/fpipita/esm-middleware/commit/e0465bba9a4fc0654d553908e154cd189ba12d46))

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
