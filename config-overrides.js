const path = require('path');
const { override, addExternalBabelPlugins, addWebpackAlias } = require('customize-cra');

module.exports = override(
    ...addExternalBabelPlugins(
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-export-namespace-from',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
    ),
    addWebpackAlias({
        '@components': path.resolve(__dirname, './src/components'),
        '@models': path.resolve(__dirname, './src/models'),
        '@stores' : path.resolve(__dirname, './src/stores'),
        '@hooks' : path.resolve(__dirname, './src/hooks'),
        '@images' : path.resolve(__dirname, './src/images'),
    })
);

/*
module.exports = function override(config, env) {
    //do stuff with the webpack config...
    config.resolve.alias['@components'] = path.resolve(__dirname, './src/components');
    config.resolve.alias['@models'] = path.resolve(__dirname, './src/models');
    config.resolve.alias['@stores'] = path.resolve(__dirname, './src/stores');
    config.resolve.alias['@hooks'] = path.resolve(__dirname, './src/hooks');
    config.resolve.alias['@images'] = path.resolve(__dirname, './public/images');
    console.log("CP:", PluginClassProperties.)
    config.plugins.push(PluginClassProperties.default);

    return config;
}
*/