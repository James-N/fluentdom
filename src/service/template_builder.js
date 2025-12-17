import NodeType from '../model/NodeType';
import VNode from '../model/VNode';
import VText from '../model/VText';
import VFragment from '../model/VFragment';
import { VTemplate, VElementTemplate, VComponentTemplate, VSlotTemplate } from '../model/VTemplate';

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
 * @param {Object?=} options
 *
 * @returns {VTemplate}
 */
export function buildText (text, options) {
    return new VTemplate(NodeType.TEXT, text, options);
}

/**
 * parse template creation arguments
 *
 * @param {any[]} args  argument list
 * @param {Number} start  start index
 *
 * @returns {[VTemplate[], Object]}
 */
function readTemplateCreateArgs (args, start) {
    var children = [];
    var options = null;

    for (var i = start; i < args.length; i++) {
        var arg = args[i];
        if (utility.isStr(arg)) {
            children.push(buildText(arg));
        } else if (Array.isArray(arg)) {
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
 * @param {VTemplate[]?} children  list of child templates
 * @param {Object?} options
 *
 * @returns {VTemplate}
 */
function createElementTemplate (tagName, children, options) {
    var template = new VElementTemplate(tagName, options);

    if (children !== null) {
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
 * @param {Object?=}  options
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
 * @param {Number} paramCount  parametrized
 *
 * @returns {[any[], Object]}
 */
function readParametrizedTemplateArgs (args, start, paramCount) {
    var elmArgs = [];
    var options = null;

    var optionIndex = start + paramCount;
    var endIndex = Math.min(args.length, optionIndex + 1);
    for (var i = start; i < endIndex; i++) {
        var arg = args[i];
        if (i == optionIndex) {
            if (!Array.isArray(arg) && (utility.isObj(arg) || arg === undefined)) {
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
 * @param {Object?=} options
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
 * @param {Object?=} options
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
 * @param {Boolean|function(VNode):Boolean} condition  condition value or function
 * @param {...any} args
 *
 * @returns {VTemplate}
 */
export function buildIf (condition, ...args) {
    if (!utility.isFunc(condition)) {
        condition = ((c) => () => !!c)(condition);
    }

    var [children, options] = readTemplateCreateArgs(args, 0);

    var template = new VTemplate(NodeType.IF, condition, options);
    template.children = children;

    return template;
}

/**
 * create template for repeat node
 *
 * @param {Number|Array|function(VNode):Number|Array} dataOrProvider  init value for repeat
 * @param {...any} args
 *
 * @returns {VTemplate}
 */
export function buildRepeat (dataOrProvider, ...args) {
    if (!Array.isArray(dataOrProvider) &&
        !utility.isValidNum(dataOrProvider) &&
        !utility.isFunc(dataOrProvider)) {
        throw new TypeError("dataOrProvider input must be array, number or function");
    }

    var key = utility.isFunc(args[0]) ? args[0] : null;
    var [children, options] = readTemplateCreateArgs(args, key ? 1 : 0);

    if (key) {
        options = options || {};
        options.key = key;
    }

    var template = new VTemplate(NodeType.REPEAT, dataOrProvider, options);
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

    return new VTemplate(NodeType.DYNAMIC, provider, { once: !!once });
}

/**
 * create template for fragment node
 *
 * @param {String|Node|Node[]|function(VFragment):String|Node|Node[]} content  fragment content or provider
 * @param {Object=} options  fragment options
 *
 * @returns {VTemplate}
 */
export function buildFragment (content, options) {
    return new VTemplate(NodeType.FRAGMENT, content, options);
}

/**
 * create template slot
 *
 * @param {...any} args
 * @returns {VSlotTemplate}
 */
export function buildSlot (...args) {
    var [children, options] = readTemplateCreateArgs(args, 0);

    var template = new VSlotTemplate(options);
    template.children = children;

    return template;
}


/* -------------------- --- -------------------- */
// component template builder
/* -------------------- --- -------------------- */

/**
 * create builder function for component
 *
 * @param {Object} componentDef  component definition
 * @param {Boolean=} bindToTpl  bind component definition onto template
 *
 * @returns {function(...any):VComponentTemplate}
 */
export function getComponentBuilder (componentDef, bindToTpl = false) {
    return function (...args) {
        var argCount = componentDef.builderArgs.length;
        var nodeArgs = argCount > 0 ? args.slice(0, argCount) : [];
        var [children, options] = readTemplateCreateArgs(args, argCount);

        if (!componentDef.children && children.length > 0) {
            throw new Error(`component [${componentDef.name}] does not accept any children`);
        }

        // update options using arguments
        for (var a = 0; a < componentDef.builderArgs.length; a++) {
            options = utility.setOptionValue(options, componentDef.builderArgs[a], nodeArgs[a]);
        }

        // create component tempalte instance
        var tpl;
        if (!!componentDef.templateClass &&
            utility.isSubclass(componentDef.templateClass, VComponentTemplate)) {
            tpl = new componentDef.templateClass(componentDef.name, null, options);
        } else {
            tpl = new VComponentTemplate(componentDef.name, null, options);
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
    var template = new VComponentTemplate(name, null, null);
    template.$args = args;

    return template;
}