import utility from './utility';
import Directive from '../model/Directive';

/**
 * @typedef {(new function(any=): Directive)|(function(any=): Directive)} DriectiveFactory
 */

/**
 * directive option registration
 *
 * @type {Record<String, DriectiveFactory[]>}
 */
export const DIRECTIEV_REGISTRATION = {};


/**
 * delegate class for inline-defined directives
 */
class DirectiveDelegate extends Directive {
    /**
     * @param {String} name  directive name
     * @param {any} impl  directive implementation
     */
    constructor (name, impl) {
        super();

        /**
         * @type {String}  directive name
         */
        this.name = name;

        // set priority if necessary
        if (utility.isObj(impl)) {
            var priority = utility.getOptionValue(impl, 'priority', 0);
            if (priority != 0) {
                this.priority = priority;
            }
        }

        this._impl = {
            precompile: utility.isFunc(impl.precompile) ? impl.precompile : null,
            postcompile: utility.isFunc(impl) ? impl : (utility.isFunc(impl.postcompile) ? impl.postcompile : null),
        };
    }

    precompile (tpl, optionValue) {
        return this._impl.precompile ? this._impl.precompile.call(null, tpl, optionValue) : tpl;
    }

    postcompile (node, optionValue) {
        if (this._impl.postcompile) {
            this._impl.postcompile.call(null, node, optionValue);
        }
    }
}

/**
 * @param {String} name  directive name
 * @param {Record<String, any>} impl  directive implementation
 *
 * @returns {function(any): DirectiveDelegate}
 */
function getDelegateFactory (name, impl) {
    return function () {
        return new DirectiveDelegate(name, impl);
    };
}

/**
 * register node builder directive
 *
 * @param {String} name  name of the directive
 * @param {any} directive  directive impelementation
 */
export function registerDirective (name, directive) {
    if (!directive) {
        throw new Error("directive impelementation is null");
    }

    if (utility.isFunc(directive)) {
        directive = utility.isSubclass(directive, Directive) ? directive : getDelegateFactory(name, directive);
    } else {
        directive = getDelegateFactory(name, directive);
    }

    DIRECTIEV_REGISTRATION[name] = directive;
}

/**
 * instantiate directive by name
 *
 * @param {String} name  name of the directive to load
 * @param {any...} args  directive creation arguments
 *
 * @returns {Directive?}
 */
export function loadDirective (name, ...args) {
    var factory = DIRECTIEV_REGISTRATION[name];
    if (factory) {
        if (utility.isSubclass(factory, Directive)) {
            return new factory(...args);
        } else {
            return factory(...args);
        }
    } else {
        return null;
    }
}