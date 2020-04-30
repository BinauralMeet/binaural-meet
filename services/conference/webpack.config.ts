import HtmlWebpackPlugin from 'html-webpack-plugin'
import * as path from 'path'
import * as webpack from 'webpack'

const DEV_CONFERENCE_ID = 'conference-name'

const config: webpack.Configuration = {
  entry: './src/scripts/index.ts',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
    contentBasePublicPath: `/${DEV_CONFERENCE_ID}`,
    openPage: `${DEV_CONFERENCE_ID}`
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
    alias: {
      Models: path.resolve(__dirname, 'src/scripts/models'),
      Components: path.resolve(__dirname, 'src/scripts/components'),
      Stores: path.resolve(__dirname, 'src/scripts/stores'),
    },
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
