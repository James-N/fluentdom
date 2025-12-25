import utility from './utility';

/**
 * @typedef {import('../model/VNode')} VNode
 * @typedef {import('../model/VTemplate').VTemplate} VTemplate
 */

/**
 * @typedef {(new (any=) => Directive)|((any=) => Directive)} DriectiveFactory
 */

/**
 * directive option registration
 *
 * @type {Record<String, DriectiveFactory[]>}
 */
export const DIRECTIEV_REGISTRATION = {};


/**
 * directive base class
 *
 * @abstract
 */
export class Directive {
    constructor () {
        /**
         * directive priority
         *
         * @type {Number}
         */
        this.priority = 0;

        /**
         * directive name
         *
         * @type {String}
         */
        this.name = '';
    }

    /**
     * handle invoked before template compilation
     *
     * @param {VTemplate} tpl  template template to be compiled
     * @returns {VTemplate}
     *
     * @virtual
     */
    precompile (tpl) { return tpl; }

    /**
     * handle invoked after template is compiled into node
     *
     * @param {VNode} node  the node this directive attached to
     * @param {VTemplate} tpl  the compiled template
     *
     * @virtual
     */
    postcompile (node, tpl) { return; }

    /**
     * destroy directive, normally triggered by node destruction
     *
     * @virtual
     */
    destroy () { return; }
}

/**
 * delegate class for inline-defined directives
 */
class DirectiveDelegate extends Directive {
    constructor (impl, initValue) {
        super();

        // set priority if necessary
        if (utility.isObj(impl)) {
            var priority = utility.getOptionValue(impl, 'priority', 0);
            if (priority != 0) {
                this.priority = priority;
            }
        }

        this._impl = {
            precompile: utility.isFunc(impl.precompile) ? impl.precompile : null,
            postcompile: utility.isFunc(impl) ? impl : (utility.isFunc(impl.postcompile) ? impl.postcompile : null)
        };

        this._initValue = initValue;
    }

    precompile (tpl) {
        return this._impl.precompile ? this._impl.precompile.call(null, tpl, this._initValue) : tpl;
    }

    postcompile (node, options) {
        if (this._impl.postcompile) {
            this._impl.postcompile.call(null, node, this._initValue, options);
        }
    }
}

/**
 * @param {String} name  directive name
 * @param {Record<String, any>} impl  directive implementation
 *
 * @returns {(any) => DirectiveDelegate}
 */
function getDelegateFactory (name, impl) {
    return function (initValue) {
        var directive = new DirectiveDelegate(impl, initValue);
        directive.name = name;

        return directive;
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

    var register = DIRECTIEV_REGISTRATION[name];
    if (!register) {
        register = [];
        DIRECTIEV_REGISTRATION[name] = register;
    }

    register.push(directive);
}

/**
 * get registered directive factories by name
 *
 * @param {String} name  directive name
 * @returns {DriectiveFactory[]?}
 */
export function getDirectives (name) {
    return DIRECTIEV_REGISTRATION[name] || null;
}

/**
 * batch instantiate directives from template options
 *
 * @param {any} options  template options
 * @returns {Directive[]?}
 */
export function loadDirectives (options) {
    var directives = [];

    for (let [key, opt] of utility.entries(options)) {
        if (opt !== false) {
            let arg = utility.isBool(opt) ? undefined : opt;
            let register = getDirectives(key);
            if (register) {
                for (let factory of register) {
                    if (utility.isSubclass(factory, Directive)) {
                        directives.push(new factory(arg));
                    } else {
                        directives.push(factory(arg));
                    }
                }
            }
        }
    }

    if (directives.length > 0) {
        return utility.stableSort(directives, (a, b) => a.priority - b.priority);
    } else {
        return null;
    }
}