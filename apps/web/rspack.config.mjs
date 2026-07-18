import { defineConfig } from '@rspack/cli'
import { DefinePlugin } from '@rspack/core'
import { ReactRefreshRspackPlugin as ReactRefreshPlugin } from '@rspack/plugin-react-refresh'
import HtmlRspackPlugin from 'html-rspack-plugin'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV !== 'production'

// 读取 .env 文件 — 缺失直接报错
const envConfig = dotenv.config({ path: path.resolve(__dirname, '.env') })
if (envConfig.error) throw new Error(`Failed to load .env: ${envConfig.error.message}`)
const env = envConfig.parsed
if (!env.API_BASE_URL) throw new Error('API_BASE_URL is required in .env')

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
      'process.env.API_BASE_URL': JSON.stringify(env.API_BASE_URL),
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
                  refresh: isDev,
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
        test: /\.svg$/,
        oneOf: [
          {
            issuer: { not: /\.[jt]sx?$/ },
            type: 'asset/resource',
          },
          {
            use: [{ loader: '@svgr/webpack' }],
            type: 'javascript/auto',
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/,
        type: 'asset/resource',
      },
    ],
  },
  devServer: {
    port: 8000,
    open: false,
    hot: true,
    historyApiFallback: true,
  },
  output: {
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    clean: true,
  },
})
