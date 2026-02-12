import NodeType from '../model/NodeType';
import VNode from '../model/VNode';
import VText from '../model/VText';
import VFragment from '../model/VFragment';
import { VTemplate, VElementTemplate, VComponentTemplate, VIfTemplate, VSlotTemplate } from '../model/VTemplate';

import utility from './utility';


function ensuerNotTemplate (obj, msg) {
    if (obj instanceof VTemplate) {
        throw new TypeError(msg);
    }
}

/* -------------------- --- -------------------- */
// dom nodes template builder
/* -------------------- --- -------------------- */

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
        if (utility.isStr(arg)) {
            children.push(buildText(arg));
        } else if (utility.isArr(arg)) {
            for (let a of arg) {
                if (a instanceof VTemplate) {
                    children.push(a);
                } else if (utility.isStr(a)) {
                    children.push(buildText(a));
                } else {
                    throw new TypeError("invalid item inside template list");
                }
            }
        } else if (utility.isObj(arg) || arg === undefined) {
            if (arg instanceof VTemplate) {
                children.push(arg);
            } else {
                if (i == (args.length - 1)) {
                    options = arg;
                } else {
                    throw new Error("template options must be the last argument");
                }
            }
        } else {
            throw new TypeError(`invalid argument[${i}] for template creation: ${arg}`);
        }
    }

    return [children, options];
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
    if (!utility.isNullOrUndef(options)) {
        ensuerNotTemplate(options, `${tagName} element cannot contain any child nodes`);
    }

    var tpl = createElementTemplate(tagName, null, options);
    tpl.$allowChildren = false;

    return tpl;
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
    var elmArgs = [];
    var options = null;

    var optionIndex = start + paramCount;
    var endIndex = Math.min(args.length, optionIndex + 1);
    for (var i = start; i < endIndex; i++) {
        var arg = args[i];
        if (i == optionIndex) {
            if (utility.isNullOrUndef(arg) || utility.isStrictObj(arg)) {
                options = arg || null;
            } else {
                throw new TypeError(`invalid argument[${i}] for template creation: ${arg}`);
            }
        } else {
            elmArgs.push(arg);
        }
    }

    for (var j = elmArgs.length; j < paramCount; j++) {
        elmArgs.push(null);
    }

    return [elmArgs, options];
}

/**
 * create template for img node
 *
 * @param {String} src  image source
 * @param {Record<String, any>=} options
 * @returns {VTemplate}
 */
export function buildImage (src, options) {
    [[src], options] = readParametrizedTemplateArgs(arguments, 0, 1);

    if (utility.isNullOrUndef(src)) {
        src = '';
    } else if (!utility.isStr(src)) {
        throw new TypeError("src must be string");
    }

    ensuerNotTemplate(options, 'IMG element cannot contain any child nodes');

    options = utility.setOptionValue(options, ['attrs', 'src'], src);

    var tpl = createElementTemplate('img', null, options);
    tpl.$allowChildren = false;

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
    } else if (!utility.isStr(src)) {
        throw new TypeError("src input must be string");
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

    ensuerNotTemplate(options, 'INPUT element cannot contain any child nodes');

    options = utility.setOptionValue(options, ['attrs', 'type'], type);

    var tpl = createElementTemplate('input', null, options);
    tpl.$allowChildren = false;

    return tpl;
}

/**
 * create template for hyper link node
 *
 * @param {...any} args
 * @returns {VTemplate}
 */
export function buildHLink (...args) {
    var href = null;
    var children = null;
    var options = null;

    if (args.length > 0) {
        if (utility.isStr(args[0]) || utility.isFunc(args[0])) {
            href = args[0];
            [children, options] = readTemplateCreateArgs(args, 1);
        } else {
            href = '';
            [children, options] = readTemplateCreateArgs(args, 0);
        }
    }

    options = utility.setOptionValue(options, ['attrs', 'href'], href);

    return createElementTemplate('a', children, options);
}

/* -------------------- --- -------------------- */
// control nodes template builder
/* -------------------- --- -------------------- */

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
 * @param {function(VNode):VTemplate|VTemplate[]} provider  dynamic provider
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
 * @param {String|Node|Node[]|function(VFragment):String|Node|Node[]} content  fragment content or provider
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


/* -------------------- --- -------------------- */
// component template builder
/* -------------------- --- -------------------- */

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

/**
 * special option builder class for handlers
 */
export class HandlerOption {
    /**
     * @param {Function} handler
     */
    constructor (handler) {
        /**
         * @type {Function}
         */
        this.handler = handler;

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