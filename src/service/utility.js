/* -------------------- --- -------------------- */
// type or value checking utilities
/* -------------------- --- -------------------- */

const isNullOrUndef = o => o === null || o === undefined;
const isStr = s => typeof s == 'string';
const isNum = n => typeof n == 'number';
const isValidNum = n => typeof n == 'number' && !isNaN(n) && n !== Infinity;
const isFunc = f => typeof f == 'function';
const isObject = o => typeof o == 'object';
const isDOMNode = n => n instanceof window.Node;
const isElementNode = n => n instanceof window.Element;

/* -------------------- --- -------------------- */
// utility namespace
/* -------------------- --- -------------------- */

export default {
    isNullOrUndef: isNullOrUndef,
    isStr: isStr,
    isNum: isNum,
    isValidNum: isValidNum,
    isFunc: isFunc,
    isObject: isObject,
    isDOMNode: isDOMNode,
    isElementNode: isElementNode,

    /**
     * subclass checking, only works for ES6 `class` syntax based classes
     */
    isSubclass: function (cls1, cls2) {
        if (!isFunc(cls1) || !cls1.prototype) {
            throw new Error("cls1 is not a class");
        }

        if (!isFunc(cls2) || !cls2.prototype) {
            throw new Error("cls2 is not a class");
        }

        if (cls1 === cls2) {
            return false;
        } else {
            return cls1.prototype instanceof cls2;
        }
    },

    extend: Object.assign || function (target, source) {
        if (isNullOrUndef(target)) {
            throw new TypeError("cannot extend null or undefined");
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
        if (!isStr(value)) {
            throw new TypeError(`${name} must be string`);
        }

        if (value.length === 0) {
            throw new Error(`${name} is empty string`);
        }
    }
};