import CopyPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import * as path from 'path'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import * as webpack from 'webpack'
import * as webpackDevServer from 'webpack-dev-server'


const TerserPlugin = require('terser-webpack-plugin')
const Visualizer = require('webpack-visualizer-plugin')
const WebpackGitHash = require('webpack-git-hash')
const webpackMode_ = process.env.MODE as ('production' | 'development')
const webpackMode = webpackMode_ ? webpackMode_ : 'development'
// Handle with error of tsconfig-paths-webpack-plugin
// https://github.com/dividab/tsconfig-paths-webpack-plugin/issues/32
delete process.env.TS_NODE_PROJECT

const DEV_CONFERENCE_ID = 'conference-name'

const reactDom = process.env.PROFILING === 'true' ? 'react-dom/profiling' : 'react-dom'
const schedulerTracing = process.env.PROFILING === 'true' ?  'scheduler/tracing-profiling' : 'scheduler/tracing'
const doMinimize = (webpackMode === 'production') ? true : false

const config: webpack.Configuration = {
  stats: 'normal',
  entry: './src/scripts/index.tsx',
  devtool: 'source-map',
  mode: webpackMode,
  optimization: {
    minimize: doMinimize,
    minimizer: [new TerserPlugin()],
  },
  devServer: {
    contentBase: 'dist',
    compress: true,
    port: 9000,
    openPage: `?room=${DEV_CONFERENCE_ID}`,
    host: '0.0.0.0',
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
      }, {
        test: /\.(png|jpg|jpeg|gif)$/,
        use: ['file-loader'],
      },
    ],
  },
  resolve: {
    alias: {
      '@libs/lib-jitsi-meet': path.resolve(__dirname, 'dist', 'lib-jitsi-meet.min'),
      'react-dom$': reactDom,
      'scheduler/tracing': schedulerTracing,
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
    new CopyPlugin({
      patterns: [
        {from: './src/config.js', to: path.resolve(__dirname, 'dist')},
        {from: './src/entrance.html', to: path.resolve(__dirname, 'dist')},
        {from: './src/entrance.ja.html', to: path.resolve(__dirname, 'dist')},
        {from: './src/favicon.ico', to: path.resolve(__dirname, 'dist')},
      ],
      options: {
        concurrency: 100,
      },
    }),
  ],
  watchOptions: {
    ignored: ['node_modules/**', 'libs/**'],
  },
}

export default config
