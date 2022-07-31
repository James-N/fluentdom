export default {
    isNullOrUndefined: o => o === null || o === undefined,
    isString: s => typeof s == 'string',
    isNumber: n => typeof n == 'number',
    isValidNumber: n => typeof n == 'number' && !isNaN(n) && n !== Infinity,
    isFunction: f => typeof f == 'function',
    isObject: o => typeof o == 'object',
    isDOMNode: n => n instanceof window.Node,
    isElementNode: n => n instanceof window.Element,

    /**
     * subclass checking, only works for ES6 `class` syntax based classes
     */
    isSubclass: function (cls1, cls2) {
        if (typeof cls1 != 'function' || !cls1.prototype) {
            throw new Error("cls1 is not a class");
        }

        if (typeof cls2 != 'function' || !cls2.prototype) {
            throw new Error("cls2 is not a class");
        }

        if (cls1 === cls2) {
            return false;
        } else {
            return cls1.prototype instanceof cls2;
        }
    },

    extend: Object.assign || function (target, source) {
        if (target === null) {
            throw new TypeError("cannot extend null");
        }

        if (target === undefined) {
            throw new TypeError("cannot extend undefined");
        }

        if (source !== null && source !== undefined) {
            Object.keys(source).forEach(a => {
                target[a] = source[a];
            });
        }

        return target;
    },
    entries: Object.entries || function (obj) {
        return Object.keys(obj).map(a => [a, obj[a]]);
    },

    /**
     * @param {Any} value
     * @param {String} name
     */
    ensureValidString: function (value, name) {
        if (typeof value != 'string') {
            throw new TypeError(`${name} must be string`);
        }

        if (value.length === 0) {
            throw new Error(`${name} is empty string`);
        }
    }
};