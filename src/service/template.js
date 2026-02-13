import NodeType from '../model/NodeType';
import VText from '../model/VText';
import { VTemplate, VElementTemplate, VComponentTemplate, VIfTemplate, VSlotTemplate } from '../model/VTemplate';
import { Expr } from '../model/Expr';

import utility from './utility';


//#region  utility builders

/**
 * special option builder class for handlers
 */
export class CallbackBuilder {
    /**
     * @param {Function} cb
     */
    constructor (cb) {
        if (!utility.isFunc(cb)) {
            throw new TypeError("cb must be function");
        }

        /**
         * @type {Function}
         */
        this.fn = cb;

        /**
         * @type {Record<String, any>}
         */
        this.flags = {};
    }

    once () {
        this.flags.once = true;
        return this;
    }
}

//#endregion

//#region  builder utility functions

/**
 * @param {any} value
 * @returns {Boolean}
 */
function maybeExpr (value) {
    return utility.isFunc(value) || value instanceof Expr;
}

/**
 * @param {any} value
 * @returns {Boolean}
 */
function isCallback (value) {
    return utility.isFunc(value) || value instanceof CallbackBuilder;
}

/**
 * @param {any} value
 * @returns {VTemplate?}
 */
function tryReadTemplate (value) {
    if (utility.isStr(value)) {
        return buildText(value);
    } else if (value instanceof VTemplate) {
        return value;
    } else {
        return null;
    }
}

/**
 * @param {Array} tpls
 * @param {(function(any, Number):String)=} errMsg
 *
 * @returns {VTemplate[]}
 */
function readTemplateList (tpls, errMsg) {
    return tpls.map((t, i) => {
        var tpl = tryReadTemplate(t);
        if (tpl) {
            return tpl;
        } else {
            throw new TypeError(errMsg ? errMsg(t, i) : "invalid item inside template list");
        }
    });
}

/**
 * @param {any} value
 * @param {(() => String)=} errMsg
 *
 * @returns {Record<String, any>?}
 */
function readOptions (value, errMsg) {
    if (utility.isNullOrUndef(value)) {
        return null;
    } else if (utility.isObj(value)) {
        return value;
    } else {
        throw new TypeError(errMsg ? errMsg() : "invalid template options");
    }
}

/**
 * parse template creation arguments
 *
 * @param {any[]} args  argument list
 * @param {Number} start  start index
 *
 * @returns {[VTemplate[], Record<String, any>?]}
 */
function readTemplateCreateArgs (args, start) {
    var children = [];
    var options = null;

    for (var i = start; i < args.length; i++) {
        var arg = args[i];
        var child;
        if (utility.isArr(arg)) {
            children.push(...readTemplateList(arg));
        } else if (child = tryReadTemplate(arg)) {
            children.push(child);
        } else {
            if (i == (args.length - 1)) {
                options = readOptions(arg);
            } else {
                throw new TypeError(`invalid argument[${i}] for template creation: ${arg}`);
            }
        }
    }

    return [children, options];
}

/**
 * parse parametrized template creation arguments
 *
 * @param {any[]} args  argument list
 * @param {Number} start  start index
 * @param {Number} paramCount  number of parametrized arguments
 *
 * @returns {[any[], Record<String, any>]}
 */
function readParametrizedTemplateArgs (args, start, paramCount) {
    var tplArgs = [];
    var options = null;

    var optionIndex = start + paramCount;
    var endIndex = Math.min(args.length, optionIndex + 1);
    for (var i = start; i < endIndex; i++) {
        if (i == optionIndex) {
            options = readOptions(args[i]);
        } else {
            tplArgs.push(args[i]);
        }
    }

    return [tplArgs, options];
}

//#endregion

//#region  dom nodes template builder

/**
 * create template for text node
 *
 * @param {String|function(VText):String} text
 * @param {Record<String, any>=} options
 *
 * @returns {VTemplate}
 */
export function buildText (text, options) {
    return new VTemplate(NodeType.TEXT, [text], options);
}

/**
 * core function to create element template
 *
 * @param {String} tagName  element tag name
 * @param {VTemplate[]=} children  list of child templates
 * @param {Record<String, any>=} options
 *
 * @returns {VTemplate}
 */
function createElementTemplate (tagName, children, options) {
    var template = new VElementTemplate(tagName, options);

    if (children) {
        template.children = children;
    }

    return template;
}

/**
 * create template for element node
 *
 * @param {String}  tagName
 * @param {...any}  args
 *
 * @returns {VTemplate}
 */
export function buildElement (tagName, ...args) {
    var [children, options] = readTemplateCreateArgs(args, 0);

    return createElementTemplate(tagName, children, options);
}

/**
 * create template for element should not contain children
 *
 * @param {String}  tagName
 * @param {Record<String, any>=}  options
 *
 * @returns {VTemplate}
 */
export function buildVoidElement (tagName, options) {
    if (!utility.isNullOrUndef(options) && options instanceof VTemplate) {
        throw new TypeError(`${tagName.toUpperCase()} element cannot contain any child nodes`);
    }

    var tpl = createElementTemplate(tagName, null, options);
    tpl.$allowChildren = false;

    return tpl;
}

/**
 * create template for void element with `src` attribute
 *
 * @param {String} tagName
 * @param  {...any} args
 * @returns {VTemplate}
 */
export function buildSrcElement (tagName, ...args) {
    var src, options;
    [[src], options] = readParametrizedTemplateArgs(args, 0, 1);

    if (utility.isNullOrUndef(src)) {
        src = '';
    } else if (!utility.isStr(src) && !maybeExpr(src)) {
        throw new TypeError(`invalid ${tagName.toUpperCase()} src`);
    }

    var tpl = buildVoidElement(tagName, options);
    tpl.options = utility.setOptionValue(tpl.options, ['attrs', 'src'], src);

    return tpl;
}

/**
 * create template for media element
 *
 * @param {String} tagName
 * @param {String} src  media source
 * @param  {...any} args
 * @returns {VTemplate}
 */
export function buildMediaElement (tagName, src, ...args) {
    if (utility.isNullOrUndef(src)) {
        src = '';
    } else if (!utility.isStr(src) && !maybeExpr(src)) {
        throw new TypeError("invalid media src");
    }

    var [children, options] = readTemplateCreateArgs(args, 0);

    options = utility.setOptionValue(options, ['attrs', 'src'], src);

    return createElementTemplate(tagName, children, options);
}

/**
 * create template for input node
 *
 * @param {String} type  input type
 * @param {Record<String, any>=} options
 * @returns {VTemplate}
 */
export function buildInput (type, options) {
    [[type], options] = readParametrizedTemplateArgs(arguments, 0, 1);

    if (utility.isNullOrUndef(type)) {
        type = '';
    } else if (!utility.isStr(type)) {
        throw new TypeError("type input must be string");
    }

    var tpl = buildVoidElement('input', options);
    tpl.options = utility.setOptionValue(tpl.options, ['attrs', 'type'], type);

    return tpl;
}

/**
 * create template for hyper link node
 *
 * @param {...any} args
 * @returns {VTemplate}
 */
export function buildHLink (...args) {
    var href = '';
    var children = null;
    var options = null;

    if (args.length > 0) {
        if (utility.isStr(args[0]) || maybeExpr(args[0])) {
            href = args[0];
            [children, options] = readTemplateCreateArgs(args, 1);
        } else {
            [children, options] = readTemplateCreateArgs(args, 0);
        }
    }

    options = utility.setOptionValue(options, ['attrs', 'href'], href);

    return createElementTemplate('a', children, options);
}

export function buildButton (...args) {
    var cb = null;
    var children = null;
    var options = null;

    if (args.length > 0) {
        if (isCallback(args[1])) {
            if (args.length > 3) {
                throw new Error("too much arguments");
            }

            cb = args[1];

            if (!utility.isNullOrUndef(args[0])) {
                var child;
                if (Array.isArray(args[0])) {
                    children = readTemplateList(args[0]);
                } else if (child = tryReadTemplate(args[0])) {
                    children = [child];
                } else {
                    throw new TypeError("invalid button content");
                }
            }

            options = readOptions(args[2], () => "invalid button options");
        } else {
            [children, options] = readTemplateCreateArgs(args, 0);
        }
    }

    if (cb) {
        options = utility.setOptionValue(options, ['events', 'click'], cb);
    }

    return createElementTemplate('button', children, options);
}

//#endregion

//#region  control nodes template builder

/**
 * create template for empty node
 *
 * @param {...any} args
 * @returns {VTemplate}
 */
export function buildEmpty(...args) {
    var [children, options] = readTemplateCreateArgs(args, 0);

    var template = new VTemplate(NodeType.EMPTY, null, options);
    template.children = children;

    return template;
}

/**
 * create template for if node
 *
 * @param {...any} args
 * @returns {VTemplate}
 */
export function buildIf (...args) {
    var condition, children, options;
    if (args.length > 0 && (utility.isFunc(args[0]) || utility.isBool(args[0]))) {
        condition = args[0];
        [children, options] = readTemplateCreateArgs(args, 1);
    } else {
        condition = null;
        [children, options] = readTemplateCreateArgs(args, 0);

        if (children.length > 0) {
            throw new Error("missing `if` branch condition");
        }
    }

    var template = new VIfTemplate(options);
    if (condition) {
        template.if(condition, ...children);
    }

    return template;
}

/**
 * create template for repeat node
 *
 * @param {any} repeatSrc  the source value or its factory for repeating
 * @param {...any} args
 *
 * @returns {VTemplate}
 */
export function buildRepeat (repeatSrc, ...args) {
    var key = utility.isFunc(args[0]) ? args[0] : null;
    var [children, options] = readTemplateCreateArgs(args, key ? 1 : 0);

    if (key) {
        options = options || {};
        options.key = key;
    }

    var template = new VTemplate(NodeType.REPEAT, [repeatSrc], options);
    template.children = children;

    return template;
}

/**
 * create template for dynamic node
 *
 * @param {import('../model/VDynamic').TemplateProvider} provider  dynamic provider
 * @param {Boolean=} once  whether template will only be compiled once
 *
 * @returns {VTemplate}
 */
export function buildDynamic (provider, once = true) {
    if (!utility.isFunc(provider)) {
        throw new TypeError("provider input must be function");
    }

    return new VTemplate(NodeType.DYNAMIC, [provider], { once: !!once });
}

/**
 * create template for fragment node
 *
 * @param {import('../model/VFragment').FragmentContentProvider} content  fragment content provider
 * @param {Record<String, any>=} options  fragment options
 *
 * @returns {VTemplate}
 */
export function buildFragment (content, options) {
    return new VTemplate(NodeType.FRAGMENT, [content], options);
}

/**
 * create template slot
 *
 * @param {...any} args
 * @returns {VSlotTemplate}
 */
export function buildSlot (...args) {
    var name = '';
    var children = null;
    var options = null;

    if (args.length > 0) {
        if (utility.isStr(args[0])) {
            name = args[0];
            [children, options] = readTemplateCreateArgs(args, 1);
        } else {
            [children, options] = readTemplateCreateArgs(args, 0);
        }
    }

    if (options) {
        throw new Error("slot template does not accept options");
    }

    var template = new VSlotTemplate(name);
    if (children) {
        template.children = children;
    }

    return template;
}

//#endregion

//#region  component template builder

/**
 * create builder function for component
 *
 * @param {import('./component').ComponentDefinition} componentDef  component definition
 * @param {Boolean=} bindToTpl  bind component definition onto template
 *
 * @returns {function(...any):VComponentTemplate}
 */
export function getComponentBuilder (componentDef, bindToTpl = false) {
    return function (...args) {
        var argCount = componentDef.args.length;
        var nodeArgs = argCount > 0 ? args.slice(0, argCount) : [];
        var [children, options] = readTemplateCreateArgs(args, argCount);

        if (!componentDef.children && children.length > 0) {
            throw new Error(`component [${componentDef.name}] does not accept any children`);
        }

        // create component tempalte instance
        var tpl;
        if (componentDef.templateBuilder) {
            tpl = componentDef.templateBuilder.call(null, componentDef.name, nodeArgs, options);

            if (!(tpl instanceof VComponentTemplate)) {
                throw new TypeError(`invalid component template created by ${componentDef.name} template factory`);
            }
        } else {
            tpl = new VComponentTemplate(componentDef.name, nodeArgs, options);
        }

        // set template children
        if (componentDef.children) {
            tpl.children = children;
        } else {
            tpl.$allowChildren = false;
        }

        // bind definition if necessary
        if (bindToTpl) {
            tpl.$definition = componentDef;
        }

        return tpl;
    };
}

/**
 * create template for deferred component creation
 *
 * @param {String} name  component name
 * @param  {...any} args
 * @returns {VComponentTemplate}
 */
export function buildDeferredComponent(name, ...args) {
    var template = new VComponentTemplate(name, args, null);
    template.$deferred = true;

    return template;
}

//#endregion