import VTree from '../model/VTree';
import VNode from '../model/VNode';
import NodeType from '../model/NodeType';
import { VTemplate, VElementTemplate } from '../model/VTemplate';
import { ConstExpr, DynExpr, RefExpr, CompoundExpr } from '../model/Expr';
import MethodExtension from '../model/internal/MethodExtension';

import utility from '../service/utility';
import * as DOM from '../service/dom';
import * as compiler from '../service/compiler';
import * as component from '../service/component';
import * as directive from '../service/directive';
import { value2Expr } from '../service/expr';
import { CallbackBuilder } from '../service/template';


/**
 * compile template into VNode
 *
 * @overload
 * @param {VTemplate} template  the input template
 * @param {VNode?} srcNode  the node that triggers compilation
 * @returns {VNode}
 *
 *
 * @overload
 * @param {VTemplate[]} template  the input template
 * @param {VNode?} srcNode  the node that triggers compilation
 * @returns {VNode[]}
 */
export function compileTemplate (template, srcNode) {
    var tCompiler = compiler.loadCompiler(srcNode);

    if (template instanceof VTemplate) {
        return tCompiler.compile(template);
    } else if (utility.isArr(template)) {
        return template.map(t => {
            if (t instanceof VTemplate) {
                return tCompiler.compile(t);
            } else {
                throw new TypeError("template input contains invalid item");
            }
        });
    } else {
        throw new TypeError("invalid template input");
    }
}

/**
 * @typedef FluentTreeOptions
 * @property {Element|DocumentFragment|String=} elm  target location to append fluent tree
 * @property {VTemplate|VTemplate[]} template  fluent tree template
 * @property {Boolean=} render  render fluent tree automatically
 * @property {Record<String, any>=} context  fluent tree context values
 */

/**
 * create a new instance of fluent tree
 *
 * @param {FluentTreeOptions} options  config options
 * @returns {VTree}
 */
export function createFluentTree (options) {
    if (!options) {
        throw new Error("invalid fluent tree options");
    }

    if (!options.template) {
        throw new Error("missing template option");
    }

    // construct tree
    var tree = new VTree();

    if (options.context) {
        tree.ctx = options.context;
    }

    // compile content nodes
    var templates = utility.ensureArr(options.template);
    var nodes = compileTemplate(templates, tree);

    // assemble tree
    for (let node of nodes) {
        tree.addChild(node);
    }

    // mount tree
    if (options.elm) {
        var doRender = utility.hasOwn(options, 'render') ? !!options.render : true;
        tree.mount(options.elm, doRender);
    }

    return tree;
}

/**
 * @typedef DOMConvertResult
 * @property {VTemplate?} template
 * @property {VTemplate?} next
 * @property {any} state
 */

/**
 * @typedef DOM2TemplateOptions
 * @property {(function(Element, VTemplate?, any):VTemplate|DOMConvertResult|null)=} convertElement  element node conversion method
 * @property {(function(Text, VTemplate?, any):VTemplate|DOMConvertResult|null)=} convertText  text node conversion method
 * @property {(function(Comment, VTemplate?, any):VTemplate|DOMConvertResult|null)=} convertComment  comment node conversion method
 * @property {any=} state  custom stete object
 * @property {Record<String, any>=} context  context values for created fluent tree
 */

/**
 * convert existing dom node tree into vtemplate tree
 *
 * @param {Node|String} domNode  the root dom node
 * @param {DOM2TemplateOptions=} options
 *
 * @returns {VTemplate}
 */
export function templateFromDOM (domNode, options) {
    /**
     * @param {Text} textNode
     * @param {VTemplate?} parentTpl
     * @param {any} state
     *
     * @returns {VTemplate?}
     */
    function convertTextDefault (textNode, parentTpl, state) {
        if (textNode.textContent.trim() == '') {
            return null;
        } else {
            return new VTemplate(NodeType.TEXT, [textNode.textContent]);
        }
    }

    /**
     * @param {Element} elmNode
     * @param {VTemplate?} parentTpl
     * @param {any} state
     *
     * @returns {VTemplate?}
     */
    function convertElmDefault (elmNode, parentTpl, state) {
        return new VElementTemplate(elmNode.tagName);
    }

    /**
     * @param {Node} node
     * @param {VTemplate?} parentTpl
     * @param {any} state
     *
     * @returns {VTemplate?}
     */
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
                        vtpl = result.template;
                        vnextTpl = result.next;
                        state = result.state;
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
                        vtpl = result.template;
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
                            vtpl = result.template;
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
                throw new Error(`cannot convert DOM node of type [${node.nodeType}]`);
            default:
                vtpl = null;
                break;
        }

        return vtpl;
    }

    /**
     * @param {Node|String} input
     * @returns {Node}
     */
    function getDOMNode (input) {
        if (utility.isDOMNode(input)) {
            return input;
        } else if (utility.isStr(input)) {
            var node = DOM.query(input);
            if (node) {
                return node;
            } else {
                throw new Error(`cannot locate DOM node by selector [${input}]`);
            }
        } else {
            throw new TypeError("invalid DOM node");
        }
    }

    // convert DOM nodes to vtemplate recursively
    options = options || {};
    return convert(getDOMNode(domNode), null, options.state);
}

/**
 * convert existing DOM node tree into fluent tree
 *
 * @param {Node} domNode  the root dom node
 * @param {DOM2TemplateOptions=} options
 *
 * @returns {VTree}
 */
export function fluentTreeFromDOM (domNode, options) {
    // create template
    var tpl = templateFromDOM(domNode, options);

    // create fluent tree
    return createFluentTree({
        elm: domNode.parentNode,
        template: tpl,
        context: options.context
    });
}

/**
 * define a new component
 */
export const defineComponent = component.defineComponent;

/**
 * register directive
 */
export const registerDirective = directive.registerDirective;

/**
 * override the internal compiler factory
 */
export const useCompilerExtension = compiler.useCompilerExtension;

/**
 * expression factory
 */
export function createExpr (value) {
    return value2Expr(value);
}

// add quick expression factory methods
createExpr.const = function (value) { return new ConstExpr(value); };
createExpr.dyn = function (getter, defaultValue) { return new DynExpr(getter, defaultValue); };
createExpr.ref = function (value) { return value instanceof RefExpr ? new RefExpr(value) : new RefExpr(null, value); };
createExpr.comp = function (evaluator, args, defaultValue) { return new CompoundExpr(evaluator, args.map(value2Expr), defaultValue); };

/**
 * callback option builder
 *
 * @param {Function} callback
 */
export function createCallbackBuilder (callback) {
    return new CallbackBuilder(callback);
}

/**
 * register extension methods to class
 */
export const extendClass = MethodExtension.extend;