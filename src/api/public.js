import FluentTree from '../model/FluentTree';
import VEmpty from '../model/VEmpty';
import VNode from '../model/VNode';
import NodeType from '../model/NodeType';
import { VTemplate } from '../model/VTemplate';

import utility from '../service/utility';
import * as compiler from '../service/compiler';
import * as component from '../service/component';
import * as directive from '../service/directive';



/**
 * compile template into VNode
 *
 * @param {VTemplate|VTemplate[]} template  the input template
 * @returns {VNode}
 */
export function compileTemplate (template) {
    if (template instanceof VTemplate) {
        return compiler.compile(template);
    } else if (Array.isArray(template)) {
        var rootNode = new VEmpty();

        template.forEach(t => {
            if (t instanceof VTemplate) {
                rootNode.addChild(compiler.compile(t));
            } else {
                throw new TypeError("template input contains invalid item");
            }
        });

        return rootNode;
    } else {
        throw new TypeError("invalid template input");
    }
}

/**
 * create a new instance of fluent tree
 *
 * @param {Object} options  config options
 * @returns {FluentTree}
 */
export function createFluentTree (options) {
    if (!options) {
        throw new Error("invalid fluent tree options");
    }

    if (!options.template) {
        throw new Error("missing template option");
    }

    // build VNode tree
    var rootNode = compileTemplate(options.template);

    // construct fluent tree
    var tree = new FluentTree(rootNode);
    tree.setParent(options.elm);

    tree.fixedRoot = !!options.fixedRoot;

    return tree;
}

/**
 * @param {Node|String} input
 * @returns {Node?}
 */
function getDOMNode (input) {
    if (utility.isDOMNode(input)) {
        return input;
    } else if (utility.isStr(input)) {
        return document.querySelector(input);
    } else {
        throw new TypeError(`invalid element selector [${input}]`);
    }
}

/**
 * convert existing dom node tree into vtemplate tree
 *
 * @param {Node} domNode  the root dom node
 * @param {Object=} options
 *
 * @returns {VTemplate}
 */
export function templateFromDOM (domNode, options) {
    function convertTextDefault (domNode, parentTpl, state) {
        if (domNode.textContent.trim() == '\n') {
            return null;
        } else {
            return new VTemplate(NodeType.TEXT, domNode.textContent);
        }
    }

    function convertElmDefault (domNode, parentTpl, state) {
        return new VTemplate(NodeType.ELEMENT, domNode.tagName, { static: true, domNode: domNode });
    }

    function convert (node, parentTpl, state) {
        var result, vtpl;
        switch (node.nodeType) {
            case 1:     // element node
                var convertElm = options.convertElement || convertElmDefault;
                result = convertElm(node, parentTpl, state);
                if (result) {
                    var vnextTpl;
                    if (result instanceof VTemplate) {
                        vtpl = result;
                        vnextTpl = result;
                    } else {
                        vtpl = result.tpl;
                        vnextTpl = result.next || null;
                        state = result.state || null;
                    }

                    if (vtpl && vnextTpl) {
                        for (let child of node.childNodes) {
                            let vchild = convert(child, vnextTpl, state);
                            if (vchild) {
                                vnextTpl.children.push(vchild);
                            }
                        }
                    }
                } else {
                    vtpl = null;
                }
                break;
            case 3:     // text node
                var convertText = options.convertText || convertTextDefault;
                result = convertText(node, parentTpl, state);
                if (result) {
                    if (result instanceof VTemplate) {
                        vtpl = result;
                    } else {
                        vtpl = result.tpl || null;
                    }
                } else {
                    vtpl = null;
                }
                break;
            case 8:     // comment node
                var convertComment = options.convertComment || null;
                if (convertComment) {
                    result = convertComment(node, parentTpl, state);
                    if (result) {
                        if (result instanceof VTemplate) {
                            vtpl = result;
                        } else {
                            vtpl = result.tpl || null;
                        }
                    } else {
                        vtpl = null;
                    }
                } else {
                    vtpl = null;
                }
                break;
            case 9:     // document node
            case 10:    // document type node
            case 11:    // document fragment node
                throw new Error(`cannot convert node of type [${node.nodeType}]`);
            default:
                vtpl = null;
                break;
        }

        return vtpl;
    }

    domNode = getDOMNode(domNode);
    if (domNode) {
        options = utility.extend({ state: {} }, options);
        // convert dom nodes to vtemplate recursively
        return convert(domNode, null, options.state);
    } else {
        throw new TypeError("cannot locate dom node");
    }
}

/**
 * convert existing dom node tree into fluent tree
 *
 * @param {Node} domNode  the root dom node
 * @param {Object=} options
 *
 * @returns {VNode}
 */
export function fluentTreeFromDOM (domNode, options) {
    // create template
    var tpl = templateFromDOM(domNode, options);

    // prepare fluent tree options
    options = options || { fixedRoot: true };
    options.elm = domNode.parentNode;
    options.template = tpl;

    // create fluent tree
    return createFluentTree(options);
}

/**
 * define a new component
 *
 * @param {Object} componentOpt  component options
 * @returns {function(...any):VComponentTemplate}
 */
export const defineComponent = component.defineComponent;

/**
 * register directive
 *
 * @param {String} name  name of the directive
 * @param {Object|Function} directive  directive implementation
 */
export const registerdirective = directive.registerDirective;