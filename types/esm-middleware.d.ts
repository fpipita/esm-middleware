export = esmMiddlewareFactory;
/**
 * Babel plugin handbook https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
 * ESTree AST reference https://github.com/babel/babylon/blob/master/ast/spec.md
 */
/**
 * @typedef {Object} BabelPluginEsmResolverOptions
 * @property {string} currentModuleAbsolutePath
 * @property {import("./esm-middleware").EsmMiddlewareConfigObject} config
 */
/**
 * @typedef {Object} BabelPluginEsmMiddlewareState
 * @property {BabelPluginEsmResolverOptions} opts
 */
/**
 * @callback EsmMiddlewareBabelPlugin
 * @returns {babel.PluginObj<BabelPluginEsmMiddlewareState>}
 */
/**
 * @typedef {Object} CacheEntry
 * @property {string} hash
 * @property {string} code
 */
/**
 * @typedef {Object} EsmMiddlewareConfigObject
 * @property {string} [root=path.resolve()] absolute local path where user
 * code is located.
 * @property {string} [rootPublicPath="/"] defines the endpoint at which
 * source code will be made available.
 * @property {string} [nodeModulesRoot=path.resolve("node_modules")]
 * absolute local path pointing to the directory where npm packages
 * are located.
 * @property {string} [nodeModulesPublicPath="/node_modules"] defines
 * the endpoint at which node_modules will be made available.
 * @property {boolean} [removeUnresolved=true] if `true`, modules that
 * couldn't be resolved are removed.
 * @property {boolean} [disableCaching=false] if `true`, caching will be
 * disabled and modules will be recompiled on each request.
 * @property {typeof import("fs")} [_fs] only used for testing purposes,
 * it is an object implementing the `fs` module interface.
 */
/**
 * @typedef {EsmMiddlewareConfigObject | string} EsmMiddlewareOptions
 */
/**
 *
 * @param {EsmMiddlewareOptions=} root optional, combined with req.url,
 * determines the file to serve. Defaults to the current
 * working directory.
 * @param {EsmMiddlewareConfigObject=} options
 * @returns {import("express").Handler}
 */
declare function esmMiddlewareFactory(root?: string | EsmMiddlewareConfigObject | undefined, options?: EsmMiddlewareConfigObject | undefined): any;
declare namespace esmMiddlewareFactory {
    export { BabelPluginEsmResolverOptions, BabelPluginEsmMiddlewareState, EsmMiddlewareBabelPlugin, CacheEntry, EsmMiddlewareConfigObject, EsmMiddlewareOptions };
}
type EsmMiddlewareConfigObject = {
    /**
     * absolute local path where user
     * code is located.
     */
    root?: string;
    /**
     * defines the endpoint at which
     * source code will be made available.
     */
    rootPublicPath?: string;
    /**
     * absolute local path pointing to the directory where npm packages
     * are located.
     */
    nodeModulesRoot?: string;
    /**
     * defines
     * the endpoint at which node_modules will be made available.
     */
    nodeModulesPublicPath?: string;
    /**
     * if `true`, modules that
     * couldn't be resolved are removed.
     */
    removeUnresolved?: boolean;
    /**
     * if `true`, caching will be
     * disabled and modules will be recompiled on each request.
     */
    disableCaching?: boolean;
    /**
     * only used for testing purposes,
     * it is an object implementing the `fs` module interface.
     */
    _fs?: any;
};
type BabelPluginEsmResolverOptions = {
    currentModuleAbsolutePath: string;
    config: EsmMiddlewareConfigObject;
};
type BabelPluginEsmMiddlewareState = {
    opts: BabelPluginEsmResolverOptions;
};
type EsmMiddlewareBabelPlugin = () => babel.PluginObj<BabelPluginEsmMiddlewareState>;
type CacheEntry = {
    hash: string;
    code: string;
};
type EsmMiddlewareOptions = string | EsmMiddlewareConfigObject;
