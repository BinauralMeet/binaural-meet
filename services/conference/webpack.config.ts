import HtmlWebpackPlugin from 'html-webpack-plugin'
import * as path from 'path'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import * as webpack from 'webpack'

// Handle with error of tsconfig-paths-webpack-plugin
// https://github.com/dividab/tsconfig-paths-webpack-plugin/issues/32
delete process.env.TS_NODE_PROJECT

const DEV_CONFERENCE_ID = 'conference-name'

const config: webpack.Configuration = {
  entry: './src/scripts/index.ts',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
    contentBasePublicPath: `/${DEV_CONFERENCE_ID}`,
    openPage: `${DEV_CONFERENCE_ID}`,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'conference.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
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
  ],
}

export default config
