import global from './global';

/* -------------------- --- -------------------- */
// type or value checking utilities
/* -------------------- --- -------------------- */

const isNullOrUndef = o => o === null || o === undefined;
const isStr = s => typeof s == 'string';
const isNum = n => typeof n == 'number';
const isValidNum = n => typeof n == 'number' && !isNaN(n) && n !== Infinity;
const isFunc = f => typeof f == 'function';
const isObj = o => typeof o == 'object';
const isStrictObj = o => Object.prototype.toString.call(o).indexOf('Object') >= 0;
const isDOMNode = n => n instanceof global.Node;
const isElementNode = n => n instanceof global.Element;
const isDocumentFragment = n => n instanceof global.DocumentFragment;

/**
 * subclass checking, only works for ES6 `class` syntax based classes
 *
 * @returns {Boolean}
 */
function isSubclass (cls1, cls2) {
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
}

/**
 * @param {Any} value
 * @param {String} identiry
 */
function validString (value, identiry) {
    if (!isStr(value)) {
        throw new TypeError(`'${identiry}' must be string`);
    }

    if (value.length === 0) {
        throw new Error(`'${identiry}' is empty string`);
    }
}

/* -------------------- --- -------------------- */
// object manipulation utilities
/* -------------------- --- -------------------- */

const extendObject = Object.assign || function (target, ...sources) {
    if (isNullOrUndef(target)) {
        throw new TypeError("cannot extend null or undefined");
    }

    sources.forEach(source => {
        if (!isNullOrUndef(source)) {
            Object.keys(source).forEach(a => {
                target[a] = source[a];
            });
        }
    });

    return target;
};

const objectEntries = Object.entries || function (obj) {
    return Object.keys(obj).map(a => [a, obj[a]]);
};

const hasOwn = Object.hasOwn || function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
};

/**
 * set value into option set
 *
 * @param {Object?} options
 * @param {String[]|String} keyPath
 * @param {any} value
 * @param {Boolean=} whenAbsent
 * @param {Boolean=} appendArray
 *
 * @returns {Object}
 */
function setOptionValue (options, keyPath, value, whenAbsent, appendArray) {
    if (isNullOrUndef(options)) {
        options = {};
    }

    if (isStr(keyPath)) {
        keyPath = keyPath.split('.').map(k => k.trim());
    }

    var valueSet = options;
    for (var i = 0; i < keyPath.length; i++) {
        var key = keyPath[i];
        if (i < (keyPath.length - 1)) {
            var newSet = valueSet[key];
            if (!newSet) {
                newSet = {};
                valueSet[key] = newSet;
            }
            valueSet = newSet;
        } else {
            var hasOld = hasOwn(valueSet, key);

            if (!whenAbsent || !hasOld) {
                if (appendArray) {
                    var oldVal;
                    if (hasOld) {
                        oldVal = valueSet[key];
                        oldVal = Array.isArray(oldVal) ? oldVal : [oldVal];
                    } else {
                        oldVal = [];
                    }

                    if (Array.isArray(value)) {
                        oldVal = oldVal.concat(value);
                    } else {
                        oldVal.push(value);
                    }

                    valueSet[key] = oldVal;
                } else {
                    valueSet[key] = value;
                }
            }
        }
    }

    return options;
}

/**
 * retrive value from option set
 *
 * @param {Object?} options
 * @param {String} key  key name
 * @param {Any=} defaultValue  default value to return when key is not found
 *
 * @returns {Any}
 */
function getOptionValue (options, key, defaultValue) {
    if (arguments.length < 3) {
        defaultValue = null;
    }

    if (options && hasOwn(options, key)) {
        return options[key];
    } else {
        return defaultValue;
    }
}

/**
 * do naive deep-cloning for given object, plain objects and arrays are cloned recursively while primitive
 * types, functions and values of complex types will be kept as-is
 *
 * @param {Any} obj
 * @returns {Any}
 */
function simpleDeepClone (obj) {
    if (isStrictObj(obj)) {
        var cloned = {};
        objectEntries(obj).forEach(entry => {
            cloned[entry[0]] = simpleDeepClone(entry[1]);
        });

        return cloned;
    } else if (Array.isArray(obj)) {
        return obj.map(e => simpleDeepClone(e));
    } else {
        return obj;
    }
}

/* -------------------- --- -------------------- */
// string manipulation utilities
/* -------------------- --- -------------------- */

/**
 * convert kebab-case string to camelCase
 *
 * @param {String} str
 * @returns {String}
 */
function kebab2CamelCase (str) {
    return str.toLowerCase().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * convert camelCase string to kebab-case
 *
 * @param {String} str
 * @returns {String}
 */
function camel2KebabCase (str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/* -------------------- --- -------------------- */
// utility namespace
/* -------------------- --- -------------------- */

export default {
    isNullOrUndef: isNullOrUndef,
    isStr: isStr,
    isNum: isNum,
    isValidNum: isValidNum,
    isFunc: isFunc,
    isObj: isObj,
    isStrictObj: isStrictObj,
    isDOMNode: isDOMNode,
    isElementNode: isElementNode,
    isDocumentFragment: isDocumentFragment,
    isSubclass: isSubclass,
    ensureValidString: validString,

    extend: extendObject,
    entries: objectEntries,
    hasOwn: hasOwn,
    setOptionValue: setOptionValue,
    getOptionValue: getOptionValue,
    simpleDeepClone: simpleDeepClone,

    kebab2CamelCase: kebab2CamelCase,
    camel2KebabCase: camel2KebabCase
};