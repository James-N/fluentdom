import NodeType from '../model/NodeType';
import VNode from '../model/VNode';
import VText from '../model/VText';
import VElement from '../model/VElement';
import VEmpty from '../model/VEmpty';
import VIf from '../model/VIf';
import VRepeat from '../model/VRepeat';
import VDynamic from '../model/VDynamic';
import VFragment from '../model/VFragment';
import VComponent from '../model/VComponent';
import { VTemplate, VSlotTemplate, VComponentTemplate } from '../model/VTemplate';
import { Expr } from '../model/Expr';

import utility from './utility';
import LOG from './log';
import * as NODE from './node';
import { CONTEXT_MODE, getComponent, getComponentBuilder, findTemplateSlots } from './component';
import { loadDirectives } from './directive';


/**
 * store context information drution compilation
 */
class CompileContext {
    constructor () {
        this.stack = [];
    }

    /**
     * @param {VNode?} node
     */
    pushState (node) {
        var state;
        if (node) {
            state = {
                node: node,
                context: node.ctx,
                depNode: NODE.isDepNode(node) ? node : (node.dep || this.getDepNode())
            };
        } else {
            state = {
                node: null,
                context: null,
                depNode: this.getDepNode()
            };
        }

        this.stack.push(state);

        return state;
    }

    popState () {
        return this.stack.pop();
    }

    _getTopState () {
        if (this.stack.length > 0) {
            return this.stack[this.stack.length - 1];
        } else {
            return null;
        }
    }

    getNode () {
        var state = this._getTopState();
        return state ? state.node : null;
    }

    getDepNode () {
        var state = this._getTopState();
        return state ? state.depNode : null;
    }

    getNodeContext () {
        var state = this._getTopState();
        return state ? state.context : null;
    }
}

/**
 * compile extension base class
 */
export class CompilerExtension {
    /**
     * initiate extension internal states
     *
     * @param {VNode?} node  the node that launch compilation
     */
    init (node) { return; }
}

/**
 * default compiler
 */
export class Compiler {
    constructor () {
        this.ctx = new CompileContext();

        /**
         * @type {[x: (tpl: VTemplate, ctx: Record<String, any>?) => VNode]}
         */
        this._compileFuncs = {
            [NodeType.TEXT]: this._compileText,
            [NodeType.ELEMENT]: this._compileElement,
            [NodeType.EMPTY]: this._compileEmpty,
            [NodeType.IF]: this._compileIf,
            [NodeType.REPEAT]: this._compileRepeat,
            [NodeType.DYNAMIC]: this._compileDynamic,
            [NodeType.FRAGMENT]: this._compileFragment,
            [NodeType.COMPONENT]: this._compileComponent
        };

        /**
         * @type {CompilerExtension[]}
         */
        this.extensions = [];
    }

    /**
     * init internal context of compiler by VNode
     *
     * @param {VNode} node
     */
    initFrom (node) {
        this.ctx.pushState(node);
    }

    /**
     * render template into a tree
     *
     * @param {VTemplate} template
     * @returns {VNode}
     */
    compile (template) {
        if (utility.isNullOrUndef(template)) {
            throw new Error("input template is null");
        }

        if (!(template instanceof VTemplate)) {
            throw new TypeError("template must be VTemplate");
        }

        template = this._resolveDeferredTemplate(template);
        return this._compileTemplate(template.clone(), this.ctx);
    }

    /**
     * expand deferred template to actual template, currently only component template is supported
     *
     * @param {VTemplate} tpl
     * @returns {VTemplate}
     */
    _resolveDeferredTemplate (tpl) {
        if (tpl instanceof VComponentTemplate && tpl.$deferred) {
            // fetch and invoke component builder manually to get the actual component template
            var builder = getComponentBuilder(tpl.name);
            if (!builder) {
                throw new Error(`fail to expand deferred template [${tpl.name}]: unrecognized component`);
            }

            return builder(...tpl.args);
        } else {
            return tpl;
        }
    }

    _compileTemplate (tpl, ctx) {
        var compileFunc = this._compileFuncs[tpl.nodeType];
        if (compileFunc) {
            // load directives
            var directives = tpl.options ? loadDirectives(tpl.options) : null;

            // pre template transformation using directives
            if (directives) {
                tpl = this._transformTemplate(tpl, directives);
            }

            // compile the input template into vnode
            var node = compileFunc.call(this, tpl, ctx);

            // set dependency node
            node.dep = ctx.getDepNode();

            // set basic infos
            this._setNodeBasicProps(node, tpl.options);

            // register hooks
            this._attachNodeHooks(node, tpl.options);

            // attach directives to node
            if (directives) {
                this._attachNodeDirectives(node, directives, tpl.options);
            }

            // invoke node init hook
            node.invokeHook('nodeInit');

            return node;
        } else {
            throw new TypeError(`unrecognized template of type [${tpl.nodeType}]`);
        }
    }

    _transformTemplate (tpl, directives) {
        for (let directive of directives) {
            tpl = directive.precompile(tpl);
        }

        return tpl;
    }

    _attachNodeDirectives (node, directives, options) {
        for (let directive of directives) {
            directive.postcompile(node, options);
            node.directives.push(directive);
        }
    }

    _createNodeContext (topCtx, ...ctxTemplateList) {
        var newCtx;
        if (topCtx) {
            newCtx = Object.create(topCtx);
        } else {
            newCtx = {};
        }

        for (let ctxTpl of ctxTemplateList.reverse()) {
            if (ctxTpl) {
                for (let [ctxKey, ctxVal] of utility.entries(ctxTpl)) {
                    if (!utility.hasOwn(newCtx, ctxKey)) {
                        if (ctxVal instanceof Expr) {
                            // evaluate expression to get compile-time generated context value
                            newCtx[ctxKey] = ctxVal.eval();
                        } else {
                            newCtx[ctxKey] = ctxVal;
                        }
                    }
                }
            }
        }

        return newCtx;
    }

    _attachNodeContext (node, options, compileCtx) {
        var context = utility.getOptionValue(options, 'context', null);
        if (context) {
            node.ctx = this._createNodeContext(compileCtx.getNodeContext(), options.context);
        } else {
            node.ctx = compileCtx.getNodeContext();
        }
    }

    _setNodeBasicProps (node, options) {
        // set alias
        var alias = utility.getOptionValue(options, 'alias', '');
        if (alias) {
            node.alias = alias;
        }
    }

    _attachNodeHooks (node, options) {
        var hooks = utility.getOptionValue(options, 'hooks', null);
        if (hooks !== null) {
            utility.entries(hooks).forEach(([name, hook]) => {
                if (Array.isArray(hook)) {
                    hook.forEach(f => node.hook(name, f));
                } else {
                    node.hook(name, hook);
                }
            });
        }
    }

    _compileChildren (children, node, ctx) {
        ctx.pushState(node);

        children = children.slice(0);
        while (children.length > 0) {
            var child = children.shift();
            if (child instanceof VSlotTemplate) {
                children.unshift(...child.children);
            } else {
                var childNode = this._compileTemplate(child, ctx);
                // append child node manually to skip automatic reference updating
                node.children.push(childNode);
                childNode.parent = node;
            }
        }

        ctx.popState();
    }

    _compileText(tpl, ctx) {
        var textNode = new VText(tpl.arg(0));
        this._attachNodeContext(textNode, null, ctx);

        return textNode;
    }

    _compileElement (tpl, ctx) {
        var options = tpl.options;
        var domNode = utility.getOptionValue(options, 'domNode');

        var elmNode;
        if (domNode && utility.isElementNode(domNode)) {
            // bind velement with the given dom element node, should be used with care
            elmNode = new VElement(domNode.tagName);
            elmNode.domNode = domNode;
        } else {
            elmNode = new VElement(tpl.tagName || tpl.arg(0));
        }

        this._setupVElement(elmNode, options);
        this._attachNodeContext(elmNode, options, ctx);
        this._compileChildren(tpl.children, elmNode, ctx);

        return elmNode;
    }

    _setupVElement (node, options) {
        // update dom-related propreties
        if (options) {
            if (options.id) {
                node.setProp('id', options.id);
            }

            var attrs = options.attrs;
            if (attrs) {
                utility.entries(attrs).forEach(e => node.setAttr(e[0], e[1]));
            }

            var props = options.props;
            if (props) {
                utility.entries(props).forEach(e => node.setProp(e[0], e[1]));
            }

            var styles = options.styles;
            if (styles) {
                utility.entries(styles).forEach(e => node.setStyle(e[0], e[1]));
            }

            var classes = options.class;
            if (classes) {
                classes = Array.isArray(classes) ? classes : [classes];
                classes.forEach(cls => {
                    if (utility.isObj(cls)) {
                        utility.entries(cls).forEach(e => node.addClass(e[0], e[1]));
                    } else if (utility.isStr(cls) || utility.isFunc(cls)) {
                        node.addClass(cls);
                    }
                });
            }

            var events = options.events;
            if (events) {
                utility.entries(events).forEach(([name, handle]) => {
                    if (Array.isArray(handle)) {
                        handle.forEach(f => node.on(name, f));
                    } else {
                        node.on(name, handle);
                    }
                });
            }
        }
    }

    _compileEmpty (tpl, ctx) {
        var emptyNode = new VEmpty();

        this._attachNodeContext(emptyNode, tpl.options, ctx);
        this._compileChildren(tpl.children, emptyNode, ctx);

        return emptyNode;
    }

    _compileIf (tpl, ctx) {
        var ifNode = new VIf(tpl.arg(0), tpl.children);
        ifNode.cacheNode = utility.getOptionValue(tpl.options, 'cache', false);
        ifNode.ctx = ctx.getNodeContext();
        return ifNode;
    }

    _compileRepeat (tpl, ctx) {
        var repeatNode = new VRepeat(tpl.arg(0), utility.getOptionValue(tpl.options, 'key', null), tpl.children);
        this._attachNodeContext(repeatNode, tpl.options, ctx);

        return repeatNode;
    }

    _compileDynamic (tpl, ctx) {
        var dynamicNode = new VDynamic(tpl.arg(0));
        dynamicNode.once = utility.getOptionValue(tpl.options, 'once', true);
        dynamicNode.ctx = ctx.getNodeContext();
        return dynamicNode;
    }

    _compileFragment (tpl, ctx) {
        var fragNode = new VFragment(tpl.arg(0));
        fragNode.sanitize = utility.getOptionValue(tpl.options, 'sanitize', true);

        return fragNode;
    }

    _compileComponent (tpl, ctx) {
        function mergeNodeOptions (opt1, opt2) {
            if (opt1 && opt2) {
                utility.entries(opt2).forEach(([key, val]) => {
                    if (utility.hasOwn(opt1, key)) {
                        if (key == 'attrs' || key == 'props' || key == 'styles') {
                            utility.extend(opt1[key], val);
                        } else if (key == 'class') {
                            utility.setOptionValue(opt1, [key], val, false, true);
                        } else if (key == 'events' || key == 'hooks') {
                            var val1 = opt1[key];
                            val1 = Array.isArray(val1) ? val1 : [val1];
                            if (Array.isArray(val)) {
                                val1 = val1.concat(val);
                            } else {
                                val1.push(val);
                            }

                            opt1[key] = val1;
                        } else {
                            opt1[key] = val;
                        }
                    } else {
                        opt1[key] = val;
                    }
                });

                return opt1;
            } else {
                return opt1 || opt2 || null;
            }
        }

        // get component definition
        var cdef;
        if (tpl.$definition) {
            cdef = tpl.$definition;
        } else {
            cdef = getComponent(tpl.name);
            if (!cdef) {
                throw new Error(`unrecognized component [${tpl.name}]`);
            }
        }

        // generate final options
        var options = !!cdef.options ? mergeNodeOptions(utility.simpleDeepClone(cdef.options), tpl.options) : tpl.options;

        if (cdef.builderArgs.length > 0) {
            for (var a = 0; a < cdef.builderArgs.length; a++) {
                options = utility.setOptionValue(options, cdef.builderArgs[a], tpl.arg(a));
            }
        }

        // prepare component template
        var children;
        if (cdef.template) {
            if (Array.isArray(cdef.template)) {
                children = cdef.template;
            } else {
                children = [cdef.template];
            }

            // clone component's builtin template for late compilation
            children = children.map(c => c.clone());

            // attach child template to slot if necessary
            if (cdef.children && tpl.children.length > 0) {
                var slotMap = findTemplateSlots(children);
                if (slotMap) {
                    for (let tChild of tpl.children) {
                        let slotKey = (tChild.options && tChild.options.slot) || VSlotTemplate.DEFAULT_SLOT_NAME;
                        let slot = slotMap[slotKey];
                        if (slot) {
                            if (!slot.$replaced) {
                                slot.children.length = 0;
                                slot.$replaced = true;
                            }

                            slot.append(tChild);
                        }
                    }
                }
            }
        } else {
            // when component has no builtin template, take template children as its children
            if (cdef.children && tpl.children.length > 0) {
                children = tpl.children;
            } else {
                children = [];
            }
        }

        // create component node
        var componentNode;
        if (utility.isFunc(cdef.nodeClass)) {
            if (utility.isSubclass(cdef.nodeClass, VComponent)) {
                componentNode = new cdef.nodeClass(options);
            } else {
                componentNode = cdef.nodeClass.call(null, cdef.name, options);
                if (!(componentNode instanceof VComponent)) {
                    throw new TypeError(`invalid node created by ${cdef.name} component`);
                }
            }
        } else {
            var tagName = utility.camel2KebabCase(cdef.name);
            componentNode = new VComponent(tagName, options);
        }

        // set component name
        componentNode.name = cdef.name;

        // prepare component compile information
        var optionsCtx = utility.getOptionValue(options, 'context', null);

        // init context
        if (cdef.context || optionsCtx) {
            var topCtx = cdef.contextMode == CONTEXT_MODE.INHERIT ? ctx.getNodeContext() : null;
            componentNode.ctx = this._createNodeContext(topCtx, cdef.context, optionsCtx);
        }

        // compile children
        this._compileChildren(children, componentNode, ctx);

        // register component dynamic props
        utility.entries(cdef.props)
            .forEach(([prop, val]) => {
                var propVal, getter;
                if (utility.isFunc(val)) {
                    propVal = null;
                    getter = val;
                } else {
                    propVal = val.defaultValue === undefined ? null : val.defaultValue;
                    getter = utility.isFunc(val.getter) ? val.getter : null;
                }

                componentNode.defProp(prop, propVal, getter);
            });

        // setup VElement related options
        this._setupVElement(componentNode, options);

        // schedule initialization
        componentNode.hook('nodeInit', () => {
            // invoke component init method
            try {
                componentNode.init();
            } catch (err) {
                LOG.error(`error inside \`init\` method of component [${componentNode.name}]`, err);
            }

            // invoke post initializer of component definition
            if (cdef.init) {
                try {
                    cdef.init.call(null, componentNode);
                } catch (err) {
                    LOG.error(`error inside initializer function of component [${componentNode.name}]`, err);
                }
            }
        }, { once: true });

        return componentNode;
    }
}

/**
 * @typedef {(new () => CompilerExtension)|(() => CompilerExtension)} CompilerExtensionFactory
 */

/**
 * @type {CompilerExtensionFactory[]}
 */
const COMPILER_EXTENSIONS = [];

/**
 * create a new compiler
 *
 * @param {VNode?} caller  the object which requires a new compiler
 * @returns {Compiler}
 */
export function loadCompiler (caller) {
    var compiler = new Compiler();

    // TODO: compiler extension mechanism is temporarily disabled since most of its
    //       functions have been moved into directive system, which is more reasonalbe,
    //       we will come back to work on custom node compilation in extensions later.

    // for (let factory of COMPILER_EXTENSIONS) {
    //     var extension = utility.isSubclass(factory, CompilerExtension) ? new factory() : factory();
    //     extension.init(caller);
    //     compiler.extensions.push(extension);
    // }

    if (caller) {
        compiler.initFrom(caller);
    }

    return compiler;
}

/**
 * register compiler extension
 *
 * @param {CompilerExtensionFactory} factory  the extension class or factory
 */
export function useCompilerExtension (factory) {
    if (!utility.isFunc(factory)) {
        throw new TypeError("invalid compiler extension factory");
    }

    COMPILER_EXTENSIONS.push(factory);
}

/**
 * compile the given template
 *
 * @param {VTemplate} template
 * @returns {VNode}
 */
export function compile (template) {
    var compiler = loadCompiler(null);
    return compiler.compile(template);
}