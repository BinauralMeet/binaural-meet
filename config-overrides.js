const path = require('path');
const { override, addExternalBabelPlugins, addWebpackAlias, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
    ...addExternalBabelPlugins(
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
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
    }),
    addWebpackModuleRule(
        {
            test: /\.(ts|tsx)$/i,
            include: ['./libs/'],
            loader: "ts-loader",
            exclude: ["/node_modules/"],
        },
    )
);

