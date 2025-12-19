const path = require('path');
const fs = require('fs');

const webpack = require('webpack');


function getVersion() {
    var packageFile = path.join(__dirname, 'package.json');
    var package = require(packageFile);
    return package.version;
}

function addES5Option (config) {
    config.module = {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|dist)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    };
}

function addMetadataOption (config, metadata) {
    if (!config.plugins) {
        config.plugins = [];
    }

    config.plugins.push(
        new webpack.DefinePlugin({
            '__VERSION__': `'${metadata.version}'`
        })
    );
}

module.exports = (env, args) => {
    var es5 = !!env.es5;
    var dev = !!env.development;

    var distPath = path.resolve(__dirname, 'dist');
    var packageVersion = getVersion();

    var exportConfig = {
        type: 'window',
        name: 'fluent',
        export: 'default'
    };

    var envConfig = {
        arrowFunction: !es5,
        bigIntLiteral: false,
        const: !es5,
        destructuring: false,
        forOf: false
    };

    var normalConfig = {
        mode: dev ? 'development' : 'production',
        entry: './src/index.js',
        output: {
            path: distPath,
            filename: `fluentdom-${packageVersion}.js`,
            library: exportConfig,
            environment: envConfig
        },
        optimization: {
            minimize: false
        },
        devtool: false
    };

    var minifyConfig = {
        mode: dev ? 'development' : 'production',
        entry: './src/index.js',
        output: {
            path: distPath,
            filename: `fluentdom-${packageVersion}.min.js`,
            library: exportConfig,
            environment: envConfig
        },
        optimization: {
            minimize: true
        },
        devtool: false
    };

    var configs = [normalConfig, minifyConfig];

    configs.forEach(config => {
        addMetadataOption(config, { version: packageVersion });

        if (es5) {
            addES5Option(config);
        }
    });

    fs.rmdirSync(distPath, { recursive: true });

    return configs;
};