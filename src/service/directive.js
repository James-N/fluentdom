import utility from './utility';

/**
 * directive option registration
 */
export const DIRECTIEV_REGISTRATION = {};

class DirectiveDelegate {
    constructor () {
        this.directives = [];
    }

    add (directive) {
        this.directives.push(directive);
    }

    invoke (method, ...args) {
        for (let ext of this.directives) {
            var fun = ext[method];
            if (utility.isFunc(fun)) {
                fun.apply(ext, args);
            }
        }
    }

    setup (node, ...args) {
        this.invoke('setup', node, ...args);
    }
}

/**
 * register node builder directive
 *
 * @param {String} name  name of the directive
 * @param {Object|Function} directive  directive implementation
 */
export function registerDirective (name, directive) {
    directive = utility.isFunc(directive) ? { setup: directive } : directive;

    var delegate = DIRECTIEV_REGISTRATION[name];
    if (!delegate) {
        delegate = new DirectiveDelegate();
        DIRECTIEV_REGISTRATION[name] = delegate;
    }

    delegate.add(directive);
}

/**
 * get registered directive by name
 *
 * @param {String} name  directive name
 * @returns {Object}
 */
export function getDirective (name) {
    return DIRECTIEV_REGISTRATION[name] || null;
}