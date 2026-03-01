import path from 'node:path';
import fs from 'node:fs';

import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import { getBabelOutputPlugin  } from '@rollup/plugin-babel';
import progress from 'rollup-plugin-progress';


const PKG = loadPkgInfo();

function loadPkgInfo () {
    let pkgFile = path.join(import.meta.dirname, 'package.json');
    return JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
}

// plugin setup //

const pluginReplaceGlobalVars = replace({
    delimiters: ['\'', '\''],
    preventAssignment: true,

    '__VERSION__': `'${PKG.version}'`,
});

const JSDOC_ITEM_REG = /^\s*\* *@\w+/;
const JSDOC_EMPTY_LINE_REG = /^\s*\*\s*$/;
const EMPTY_LINE_REG = /^\s*$/;

const pluginCleanJSDoc = {
    name: 'jsdoc-clean',
    generateBundle (_, bundle) {
        for (let file of Object.values(bundle)) {
            file.code = file.code.replace(
                /(?<![^\s])\/\*[\s\S]*?\*\/\s*/g,
                m => {
                    let lines = m.split('\n').filter(l => !JSDOC_ITEM_REG.test(l) && !JSDOC_EMPTY_LINE_REG.test(l));
                    if (lines.length - lines.filter(l => EMPTY_LINE_REG.test(l)).length > 2) {
                        return lines.join('\n');
                    } else {
                        return '';
                    }
                }
            );
        }
    }
};

const pluginMinify = terser({
    compress: { passes: 5, module: false },
    mangle: true
});

const pluginProgress = progress({ clearLine: true });

const pluginBanner = {
    name: 'banner',
    generateBundle (_, bundle) {
        let banner = [
            '/**',
            ' * fluentdom.js',
            ` * @version v${PKG.version}`,
            ' * @license MIT',
            ` * @copyright ${new Date().getFullYear()} - James.Ni`,
            ' */\n\n'
        ].join('\n');

        for (let file of Object.values(bundle)) {
            file.code = banner + file.code
        }
    }
};

const es5Plugins = process.env.es5 == 'true' ?
    [
        getBabelOutputPlugin({
            presets: ['@babel/preset-env'],
            allowAllFormats: true
        })
    ] :
    [];

// task definitions //

const tasks = [{
    input: './src/index.js',
    output: {
        file: `./dist/fluentdom-${PKG.version}.js`,
        chunkFileNames: '[name].[hash].js',
        format: 'iife',
        name: 'fluent'
    },
    plugins: [pluginReplaceGlobalVars, pluginCleanJSDoc, ...es5Plugins, pluginBanner, pluginProgress]
}, {
    input: './src/index.js',
    output: {
        file: `./dist/fluentdom-${PKG.version}.min.js`,
        format: 'iife',
        name: 'fluent'
    },
    plugins: [pluginReplaceGlobalVars, ...es5Plugins, pluginMinify, pluginBanner, pluginProgress]
}];


export default tasks;