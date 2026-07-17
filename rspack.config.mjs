import { defineConfig } from '@rspack/cli'
import { DefinePlugin } from '@rspack/core'
import { ReactRefreshRspackPlugin as ReactRefreshPlugin } from '@rspack/plugin-react-refresh'
import HtmlRspackPlugin from 'html-rspack-plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig({
  mode: isDev ? 'development' : 'production',
  entry: {
    main: './src/main.tsx',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    isDev && new ReactRefreshPlugin(),
    new HtmlRspackPlugin({
      template: './index.html',
    }),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        isDev ? 'development' : 'production',
      ),
    }),
  ].filter(Boolean),
  module: {
    rules: [
      {
        test: /\.tsx$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'postcss-loader',
          },
        ],
        type: 'css',
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  devServer: {
    port: 3000,
    open: true,
    historyApiFallback: true,
  },
  output: {
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    clean: true,
  },
})
