import os from 'node:os';

import globals from 'globals';
import { defineConfig } from 'eslint/config';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import stylisticPlugin from '@stylistic/eslint-plugin';


export default defineConfig({
    ignores: ['eslint.config.*'],
    languageOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        globals: {
            ...globals.browser,
            ...globals.es2018,
            '__VERSION__': 'readonly',
            globalThis: 'readonly'
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
        'no-unused-vars': ['warn', { varsIgnorePattern: '^_+$' }],
        'no-undef': 'error',
        'no-dupe-args': 'error',
        'no-dupe-keys': 'error',
        'no-unreachable': 'warn',
        'curly': 'error',
        'no-redeclare': 'error',
        'no-useless-escape': 'warn',
        'constructor-super': 'error',

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
                definedTypes: ['Iterator', 'Iterable']
            }
        ]
    }
});