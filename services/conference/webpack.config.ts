import HtmlWebpackPlugin from 'html-webpack-plugin'
import * as path from 'path'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import * as webpack from 'webpack'
import * as webpackDevServer from 'webpack-dev-server'
const Visualizer = require('webpack-visualizer-plugin')
const WebpackGitHash = require('webpack-git-hash')

// Handle with error of tsconfig-paths-webpack-plugin
// https://github.com/dividab/tsconfig-paths-webpack-plugin/issues/32
delete process.env.TS_NODE_PROJECT

const DEV_CONFERENCE_ID = 'conference-name'

const config: webpack.Configuration = {
  stats: 'normal',
  entry: './src/scripts/index.tsx',
  devtool: 'source-map',
  mode: 'development',
  optimization: {
    minimize: false,
  },
  devServer: {
    contentBase: 'dist',
    compress: true,
    port: 9000,
    openPage: `?name=${DEV_CONFERENCE_ID}`,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'conference.bundle.[githash].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }, {
        // Transpile ES2015 (aka ES6) to ES5.

        exclude: [
          new RegExp(`${__dirname}/libs/lib-jitsi-meet/node_modules/(?!js-utils)`),
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
                  safari: 11,
                },
              },
            ],
            '@babel/preset-flow',
          ],
          plugins: [
            '@babel/plugin-transform-flow-strip-types',
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-proposal-export-namespace-from',
          ],
        },
        test: /\.js$/,
      }, {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ],
  },
  resolve: {
    alias: {
      '@libs/lib-jitsi-meet': path.resolve(__dirname, 'dist', 'lib-jitsi-meet.min'),
    },
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TsconfigPathsPlugin(),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Conference',
      template: './src/index.html',
      filename: 'index.html',
      hash: true,
    }),
    new Visualizer({
      filename: './statistics.html',
    }),
    new WebpackGitHash({
      cleanup: true,
    }),
  ],
}

export default config
