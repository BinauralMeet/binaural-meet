var TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')

module.exports = {
  stories: ['../src/scripts/**/*.stories.tsx'],
  webpackFinal: async config => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve('ts-loader'),
        },
        // Optional
        {
          loader: require.resolve('react-docgen-typescript-loader'),
        },
      ],
    });

    config.devtool = 'source-map';

    // modify storybook's file-loader rule to avoid conflicts with your inline svg
    const fileLoaderRule = config.module.rules.find(rule => rule.test.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    config.module.rules.push({
      exclude: [
        new RegExp(`${__dirname}/libs/lib-jitsi-meet/node_modules/(?!js-utils)`)
      ],
      loader: 'babel-loader',
      options: {
        presets: [
          [
            '@babel/preset-env',

            // Tell babel to avoid compiling imports into CommonJS
            // so that webpack may do tree shaking.
            {
              modules: false,

              // Specify our target browsers so no transpiling is
              // done unnecessarily. For browsers not specified
              // here, the ES2015+ profile will be used.
              targets: {
                chrome: 58,
                electron: 2,
                firefox: 54,
                safari: 11
              }
            }
          ],
          '@babel/preset-flow'
        ],
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-export-namespace-from',
                    ]
      },
      test: /\.js$/
    });

    config.module.rules.push({
      // Expose jquery as the globals $ and jQuery because it is expected
      // to be available in such a form by multiple jitsi-meet
      // dependencies including lib-jitsi-meet.

      loader: 'expose-loader?$!expose-loader?jQuery',
      test: /\/node_modules\/jquery\/.*\.js$/
    })

    config.resolve.extensions.push('.ts', '.tsx');
    config.resolve.plugins = [new TsconfigPathsPlugin()]
    config.resolve.alias = {
      ...config.resolve.alias,
      jquery: `jquery/dist/jquery.js`
    };

    return config;
  },
};
