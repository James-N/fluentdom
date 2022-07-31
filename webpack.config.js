const path = require('path');

const del = require('del');


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

module.exports = (env, args) => {
    var es5 = !!env.es5;
    var dev = !!env.development;

    var distPath = path.resolve(__dirname, 'dist');

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
            filename: `fluentdom-${getVersion()}.js`,
            library: exportConfig,
            environment: envConfig
        },
        optimization: {
            minimize: false
        },
        devtool: false
    };

    if (es5) {
        addES5Option(normalConfig);
    }

    var minifyConfig = {
        mode: dev ? 'development' : 'production',
        entry: './src/index.js',
        output: {
            path: distPath,
            filename: `fluentdom-${getVersion()}.min.js`,
            library: exportConfig,
            environment: envConfig
        },
        optimization: {
            minimize: true
        },
        devtool: false
    };

    if (es5) {
        addES5Option(minifyConfig);
    }

    del.sync(distPath);

    return [normalConfig, minifyConfig];
};