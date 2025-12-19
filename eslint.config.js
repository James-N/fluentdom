const os = require('os');

const globals = require('globals');
const { defineConfig } = require('eslint/config');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const stylisticPlugin = require('@stylistic/eslint-plugin');

module.exports = defineConfig({
    ignores: ['eslint.config.*'],
    languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        globals: {
            ...globals.browser,
            ...globals.es2018,
            '__VERSION__': 'readonly'
        },
        parserOptions: {
            ecmaFeatures: {
                impliedStrict: true
            }
        }
    },
    plugins: {
        jsdoc: jsdocPlugin,
        stylistic: stylisticPlugin
    },
    rules: {
        // syntax rules
        'no-extra-boolean-cast': 'off',
        'no-prototype-builtins': 'warn',
        'no-unused-vars': 'warn',
        'no-undef': 'error',
        'no-dupe-args': 'error',
        'no-dupe-keys': 'error',
        'no-unreachable': 'warn',
        'curly': 'error',
        'no-redeclare': 'error',
        'no-useless-escape': 'warn',

        // style rules
        'stylistic/indent': [
            'warn',
            4,
            {
                ignoredNodes: ['CallExpression', 'MemberExpression'],
                SwitchCase: 1
            }
        ],
        'stylistic/linebreak-style': [
            'warn',
            os.platform() == 'win32' ? 'windows' : 'unix'
        ],
        'stylistic/quotes': [
            'off',
            'single'
        ],
        'stylistic/semi': [
            'warn',
            'always'
        ],
        'stylistic/no-extra-semi': 'warn',

        // jsdoc rules
        'jsdoc/no-undefined-types': [
            'warn',
            {
                definedTypes: ['Any', 'Promise', 'Map', 'Set']
            }
        ]
    }
});