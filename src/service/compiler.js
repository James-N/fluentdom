import NodeType from '../model/NodeType';
import VNode from '../model/VNode';
import VText from '../model/VText';
import VElement from '../model/VElement';
import VEmpty from '../model/VEmpty';
import VIf from '../model/VIf';
import VIfElse from '../model/VIfElse';
import VRepeat from '../model/VRepeat';
import VDynamic from '../model/VDynamic';
import VFragment from '../model/VFragment';
import VComponent from '../model/VComponent';
import { VTemplate, VSlotTemplate, VComponentTemplate, VIfTemplate, VElementTemplate } from '../model/VTemplate';
import { Expr } from '../model/Expr';
import Directive from '../model/Directive';

import utility from './utility';
import LOG from './log';
import * as NODE from './node';
import { CONTEXT_MODE, getComponent, getComponentBuilder, findTemplateSlots, PROPERTY_SCHEMA, VInlineComponent, addProperty } from './component';
import { loadDirective } from './directive';
import { CallbackBuilder } from './template';


/**
 * store context information drution compilation
 */
class CompileContext {
    constructor () {
        /**
         * @type {ReturnType<typeof CompileContext.prototype.pushState>[]}
         */
        this.stack = [];
    }

    /**
     * @param {VNode?} node
     */
    pushState (node) {
        var state;
        if (node) {
            state = {
                /**
                 * @type {VNode?}
                 */
                node: node,
                /**
                 * @type {Record<String, any>?}
                 */
                context: node.ctx,
                /**
                 * @type {VNode?}
                 */
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

    /**
     * @returns {ReturnType<typeof CompileContext.prototype.pushState>}
     */
    popState () {
        return this.stack.pop();
    }

    _getTopState () {
        return utility.lastArrItem(this.stack, null);
    }

    /**
     * @returns {VNode?}
     */
    getNode () {
        var state = this._getTopState();
        return state ? state.node : null;
    }

    /**
     * @returns {VNode?}
     */
    getDepNode () {
        var state = this._getTopState();
        return state ? state.depNode : null;
    }

    /**
     * @returns {Record<String, any>?}
     */
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

//#region  compiler constants

const FALLTHROUGH_OPTION_PREFIX = 'inherit:';
const FALLTHROUGH_TARGET_OPTION = 'inherit';
const COMPONENT_PROP_OPTION_PREFIX = 'prop:';
const DIRECTIVE_OPTION_PREFIX = 'directive:';

//#endregion

//#region  compiler helper functions

/**
 * @param {Record<String, any>} options
 * @param {function(String, Function, Record<String, any>?):void} receiver
 */
function scanEventOptions (options, receiver) {
    for (let [name, value] of utility.entries(options)) {
        if (value) {
            value = utility.ensureArr(value);

            for (let callback of value) {
                if (utility.isFunc(callback)) {
                    receiver(name, callback, null);
                } else if (callback instanceof CallbackBuilder) {
                    receiver(name, callback.fn, callback.flags);
                }
            }
        }
    }
}

/**
 * expand all deferred component templates in the template tree
 *
 * @param {VTemplate} tpl
 * @returns {VTemplate}
 */
function expandComponentTemplates (tpl) {
    /**
     * @param {VComponentTemplate} tpl
     * @returns {VComponentTemplate}
     */
    function expand (tpl) {
        // expand deferred template to actual template
        if (tpl.$deferred) {
            // fetch and invoke component builder manually to get the actual component template
            var builder = getComponentBuilder(tpl.name);
            if (!builder) {
                throw new Error(`fail to expand deferred template [${tpl.name}]: unrecognized component`);
            }

            // build actual component template
            tpl = builder(...tpl.args);
        }

        // clone template
        tpl = tpl.clone();

        return tpl;
    }

    if (tpl instanceof VComponentTemplate) {
        tpl = expand(tpl);
    }

    for (var i = 0; i < tpl.children.length; i++) {
        tpl[i] = expandComponentTemplates(tpl.children[i]);
    }

    return tpl;
}

/**
 * create node context based on optional top-level context object and list of template contexts
 */
function createNodeContext (topCtx, ...ctxTemplateList) {
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

//#endregion

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
     * render template into node tree
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

        // clone whole template tree before compilation
        template = template.clone();
        // expand component templates in the template tree
        template = expandComponentTemplates(template);

        return this._compileTemplate(template, this.ctx);
    }

    /**
     * @param {VTemplate} tpl
     * @param {CompileContext} ctx
     *
     * @returns {VNode}
     */
    _compileTemplate (tpl, ctx) {
        var compileFunc = this._compileFuncs[tpl.type];
        if (compileFunc) {
            // load directives
            var directives = tpl.options ? this._loadDirectives(tpl.options) : [];

            // transformation template using directives
            if (directives.length > 0) {
                tpl = this._transformTemplateByDirectives(tpl, directives);
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
            if (directives.length > 0) {
                this._configNodeByDirectives(node, directives);
            }

            // invoke node init hook
            node.invokeHook('nodeInit');

            return node;
        } else {
            throw new TypeError(`unrecognized template of type [${tpl.type}]`);
        }
    }

    //#region  common compilation pass methods

    /**
     * @param {Record<String, any>} options
     * @returns {[Directive, String, any][]}
     */
    _loadDirectives (options) {
        var directives = [];
        var loaded = new Set();

        var entries = utility.entries(options).sort((e1, e2) => e2[0].length - e1[0].length);
        for (let [key, opt] of entries) {
            if (opt !== false) {
                var name = key.startsWith(DIRECTIVE_OPTION_PREFIX) ? key.substring(DIRECTIVE_OPTION_PREFIX.length) : key;
                if (name && !loaded.has(name)) {
                    let directive = loadDirective(name);
                    if (directive) {
                        directives.push([directive, name, opt]);
                    }
                }
            }
        }

        if (directives.length > 0) {
            return utility.stableSort(directives, (a, b) => a[0].priority - b[0].priority);
        } else {
            return directives;
        }
    }

    /**
     * @param {VTemplate} tpl
     * @param {[Directive, String, any][]} directives
     *
     * @returns {VTemplate}
     */
    _transformTemplateByDirectives (tpl, directives) {
        for (let [directive, _, opt] of directives) {
            tpl = directive.precompile(tpl, opt);
        }

        return tpl;
    }

    /**
     * @param {VNode} node
     * @param {[Directive, String, any][]} directives
     */
    _configNodeByDirectives (node, directives) {
        for (let [directive, name, opt] of directives) {
            directive.postcompile(node, opt);
            node.directives[name] = directive;
        }
    }

    /**
     * @param {VNode} node
     * @param {Record<String, any>} options
     * @param {CompileContext} compileCtx
     */
    _attachNodeContext (node, options, compileCtx) {
        var context = utility.getOptionValue(options, 'context', null);
        if (context) {
            node.ctx = createNodeContext(compileCtx.getNodeContext(), options.context);
        } else {
            node.ctx = compileCtx.getNodeContext();
        }
    }

    /**
     * @param {VNode} node
     * @param {Record<String, any>} options
     */
    _setNodeBasicProps (node, options) {
        // set alias
        var alias = utility.getOptionValue(options, 'alias', '');
        if (alias) {
            node.alias = alias;
        }
    }

    /**
     * @param {VNode} node
     * @param {Record<String, any>} options
     */
    _attachNodeHooks (node, options) {
        var hooks = utility.getOptionValue(options, 'hooks', null);
        if (hooks) {
            scanEventOptions(hooks, (name, hook, flags) => {
                node.hook(name, hook, flags);
            });
        }
    }

    /**
     * @param {VTemplate[]} children
     * @param {VNode} node
     * @param {CompileContext} ctx
     */
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

    //#endregion

    //#region  compilation methods for different type of templates

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
            elmNode.$flags.reflow = true;   // `reflow` flag must be set manually if domNode is provided from outside
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
                classes = utility.ensureArr(classes);
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
                scanEventOptions(events, (name, handler, flags) => {
                    node.on(name, handler, flags);
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
        var ifNode;
        if (tpl instanceof VIfTemplate) {
            if (tpl.children.length === 1) {
                ifNode = new VIf(tpl.children[0].arg(0), tpl.children[0].children);
            } else {
                ifNode = new VIfElse(tpl.children.map(c => [c.arg(0), c.children.length > 0 ? c.children : null]));
            }
        } else {
            ifNode = new VIf(tpl.arg(0), tpl.children);
        }

        ifNode.cacheNode = utility.getOptionValue(tpl.options, 'cache', false);
        ifNode.ctx = ctx.getNodeContext();
        return ifNode;
    }

    _compileRepeat (tpl, ctx) {
        var options = tpl.options;
        var repeatNode = new VRepeat(tpl.arg(0), utility.getOptionValue(options, 'key', null), tpl.children);
        repeatNode.keepData = utility.getOptionValue(options, 'keepData', false);
        this._attachNodeContext(repeatNode, options, ctx);

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

    /**
     * @param {VComponentTemplate} tpl
     * @param {CompileContext} ctx
     */
    _compileComponent (tpl, ctx) {
        function mergeOptions (opt1, opt2) {
            if (opt1 && opt2) {
                utility.entries(opt2).forEach(([key, val]) => {
                    if (utility.hasOwn(opt1, key)) {
                        if (key == 'attrs' || key == 'props' || key == 'styles' || key == 'context') {
                            utility.extend(opt1[key], val);
                        } else if (key == 'class') {
                            utility.setOptionValue(opt1, [key], val, false, true);
                        } else if (key == 'events' || key == 'hooks') {
                            var val1 = utility.ensureArr(opt1[key]);
                            if (utility.isArr(val)) {
                                val1.push(...val);
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

        /**
         * @param {import('./component').ComponentDefinition} cdef
         * @param {VComponentTemplate} tpl
         *
         * @returns {[Record<String, any>, Record<String, any>]}
         */
        function extractOptions (cdef, tpl) {
            var componentOptions = {}, throughOptions = {};

            // split input template options
            utility.entries(tpl.options)
                .forEach(([key, val]) => {
                    if (key == 'id' || key == 'attrs' || key == 'props' || key == 'styles' || key == 'class') {
                        throughOptions[key] = val;
                    } else if (key.startsWith(FALLTHROUGH_OPTION_PREFIX)) {
                        throughOptions[key.substring(FALLTHROUGH_OPTION_PREFIX.length)] = val;
                    } else {
                        componentOptions[key] = val;
                    }
                });

            // inject builder args into component options
            if (cdef.args.length > 0) {
                for (var i = 0; i < cdef.args.length; i++) {
                    componentOptions[cdef.args[i]] = tpl.arg(i);
                }
            }

            // merge fall-through options
            if (cdef.options) {
                throughOptions = mergeOptions(utility.simpleDeepClone(cdef.options), throughOptions);
            }

            return [componentOptions, throughOptions];
        }

        /**
         * @param {VTemplate[]} tpls
         * @param {Boolean=} includeDefault
         *
         * @returns {VTemplate?}
         */
        function findFallThroughTarget (tpls, includeDefault) {
            var defaultTarget = null;

            for (let tpl of tpls) {
                if (tpl.type == NodeType.ELEMENT || tpl.type == NodeType.COMPONENT) {
                    if (tpl.options && tpl.options[FALLTHROUGH_TARGET_OPTION]) {
                        return tpl;
                    } else {
                        let target = findFallThroughTarget(tpl.children);
                        if (target) {
                            return target;
                        } else {
                            if (includeDefault && !defaultTarget) {
                                defaultTarget = tpl;
                            }
                        }
                    }
                }
            }

            return defaultTarget;
        }

        /**
         * @param {Record<String, any>} options
         * @param {String} propName
         *
         * @returns {any|undefined}
         */
        function getPropOption (options, propName) {
            var prefixName = COMPONENT_PROP_OPTION_PREFIX + propName;
            if (utility.hasOwn(prefixName)) {
                return options[prefixName];
            } else if (utility.hasOwn(options, propName)) {
                return options[propName];
            } else {
                return undefined;
            }
        }

        // get component definition
        var cdef = tpl.$definition || getComponent(tpl.name);
        if (!cdef) {
            throw new Error(`unrecognized component [${tpl.name}]`);
        }

        // prepare options
        var [options, throughOptions] = extractOptions(cdef, tpl);

        // create component node
        var componentNode;
        if (cdef.node) {
            if (utility.isObj(cdef.node)) {
                componentNode = new VInlineComponent(cdef.name);

                // init inline component properties
                utility.entries(cdef.node)
                    .forEach(([name, prop]) => {
                        // add dynamic properties
                        if (utility.isObj(prop) && prop.schema) {
                            var initVal = prop.schema != PROPERTY_SCHEMA.METHOD && prop.option ? getPropOption(options, name) : undefined;
                            addProperty(componentNode, name, prop, initVal);
                        }
                    });
            } else if (utility.isSubclass(cdef.node, VComponent)) {
                componentNode = new cdef.node(options);
            } else {
                componentNode = cdef.nodeFactory.call(null, cdef.name, options);
                if (!(componentNode instanceof VComponent)) {
                    throw new TypeError(`invalid node created by ${cdef.name} component`);
                }
            }
        } else {
            componentNode = new VComponent(cdef.name, options);
        }

        // init & attach component context
        var optionsCtx = utility.getOptionValue(options, 'context', null);
        if (cdef.context || optionsCtx) {
            var topCtx = cdef.contextMode == CONTEXT_MODE.INHERIT ? ctx.getNodeContext() : null;
            componentNode.ctx = createNodeContext(topCtx, cdef.context, optionsCtx);
        }

        // prepare component children template
        var children = cdef.template ?
            // clone component's builtin template for late compilation
            utility.ensureArr(cdef.template).map(c => c.clone()) :
            // no need to clone template generated by `template` method of component node
            utility.ensureArr(componentNode.template(), t => t ? [t] : []);

        if (cdef.children && children.length > 0) {
            // attach child template to slot if necessary
            if (tpl.children.length > 0) {
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
            children = cdef.children ? tpl.children : children;
        }

        if (cdef.root) {
            var rootTpl = new VElementTemplate(utility.camel2KebabCase(cdef.name), throughOptions);
            rootTpl.children = children;
            children = [rootTpl];
        } else {
            var throughTarget = findFallThroughTarget(children, true);
            if (throughTarget) {
                throughTarget.options = mergeOptions(throughTarget.options, throughOptions);
            }
        }

        // compile children
        if (children.length > 0) {
            this._compileChildren(children, componentNode, ctx);
        }

        // schedule initialization
        componentNode.hook('nodeInit', () => {
            if (componentNode instanceof VInlineComponent) {
                // invoke init function for inline component
                var init = cdef.node.init;
                if (utility.isFunc(init)) {
                    try {
                        init(componentNode);
                    } catch (err) {
                        LOG.error(`error inside initializer function of component [${componentNode.name}]`, err);
                    }
                }
            } else {
                // invoke component init method
                try {
                    componentNode.init();
                } catch (err) {
                    LOG.error(`error inside \`init\` method of component [${componentNode.name}]`, err);
                }
            }
        }, { once: true });

        return componentNode;
    }

    //#endregion
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