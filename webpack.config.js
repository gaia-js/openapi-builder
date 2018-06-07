'use strict';
// webpack 基础配置

const fs = require('fs');
const path = require('path');

const webpackConfig = {
    entry: {
        index: "./src/msggen2openapi.ts",
    },

    output: {
        filename: '[name].js',
        path: path.join(__dirname, 'dist'),
        libraryTarget: "global",
    },

    mode: "production",

    target: "node",

    resolveLoader: {
        modules: [path.join(__dirname, "node_modules")],
    },
  
    resolve: {
        modules: [
          path.join(__dirname, "src"),
          path.join(__dirname, "node_modules")
        ],
        extensions: ['.js', '.ts', '.tsx']
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/
            },
        ]
    }
};

module.exports = webpackConfig;
