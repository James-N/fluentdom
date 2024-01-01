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
import { VTemplate, VSlotTemplate } from '../model/VTemplate';

import utility from './utility';
import LOG from './log';
import * as NODE from './node';
import { CONTEXT_MODE, getComponent, getComponentBuilder } from './component';
import { getDirective } from './directive';


function mergeNodeOptions (opt1, opt2) {
    if (opt1 && opt2) {
        var opt = utility.extend({}, opt1);

        utility.entries(opt2).forEach(([key, val]) => {
            if (opt.hasOwnProperty(key)) {
                if (key == 'attrs' ||
                    key == 'props' ||
                    key == 'styles' ||
                    key == 'events') {
                    utility.extend(opt[key], val);
                } else if (key == 'class') {
                    utility.setOptionValue(opt, [key], val, false, true);
                } else {
                    opt[key] = val;
                }
            } else {
                opt[key] = val;
            }
        });

        return opt;
    } else {
        return opt1 || opt2 || null;
    }
}

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

    /**
     * pre-compilation callback used to transform template
     *
     * @param {VTemplate} tpl  template to be compiled
     * @returns {VTemplate?}
     */
    onBeforeNodeCompile (tpl) { return tpl; }

    /**
     * post-compilation callback used to post-process nodes being compiled
     *
     * @param {VNode} node  the compiled node
     * @param {VTemplate} tpl  the template used to compile the node
     *
     * @returns {VNode?}
     */
    onNodeCompiled (node, tpl) { return node; }
}

/**
 * default compiler
 */
export class Compiler {
    constructor () {
        this.ctx = new CompileContext();

        /**
         * @type {[x: (tpl: any, ctx: any) => VNode]}
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

        return this._compileTemplate(template, this.ctx);
    }

    _compileTemplate (tpl, ctx) {
        var compileFunc = this._compileFuncs[tpl.nodeType];
        if (compileFunc) {
            // invoke pre-compilation callbacks
            this.extensions.forEach(ext => {
                tpl = ext.onBeforeNodeCompile(tpl) || tpl;
            });

            // compile the input template into vnode
            var node = compileFunc.call(this, tpl, ctx);

            // set dependency node
            node.dep = ctx.getDepNode();

            // set basic infos
            this._setNodeBasicProps(node, tpl.options);

            // register hooks
            this._attachNodeHooks(node, tpl.options);

            // load and run directives
            this._loadNodeDirectives(node, tpl.options);

            // invoke post-compilation callbacks
            this.extensions.forEach(ext => {
                node = ext.onNodeCompiled(node, tpl) || node;
            });

            // invoke node init hook
            node.invokeHook('nodeInit');

            return node;
        } else {
            throw new TypeError(`unrecognized template of type [${tpl.nodeType}]`);
        }
    }

    _createNodeContext (topCtx, ...ctxValueList) {
        var newCtx;
        if (topCtx) {
            newCtx = Object.create(topCtx);
        } else {
            newCtx = {};
        }

        for (let ctxValues of ctxValueList) {
            if (ctxValues) {
                utility.extend(newCtx, ctxValues);
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

        // set lazy
        var lazy = utility.getOptionValue(options, 'lazy', false);
        if (lazy) {
            node.lazy = true;
            node.flags.dirty = true;       // initial value of `dirty` flag should be true
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

    _loadNodeDirectives (node, options) {
        if (options) {
            utility.entries(options).forEach(([name, value]) => {
                var directive = getDirective(name);
                if (directive) {
                    directive.setup(node, value, options);
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
                child.children.forEach(c => children.unshift(c));
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
        var textNode = new VText(tpl.initValue);
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
            elmNode = new VElement(tpl.initValue);
        }

        this._setupVElement(elmNode, options);
        this._attachNodeContext(elmNode, options, ctx);
        this._compileChildren(tpl.children, elmNode, ctx);

        return elmNode;
    }

    _setupVElement (node, options) {
        function setElementNodeOptions (elmNode, options) {
            if (options) {
                var attrs = options.attrs;
                if (attrs) {
                    utility.entries(attrs).forEach(e => elmNode.setAttr(e[0], e[1]));
                }

                var props = options.props;
                if (props) {
                    utility.entries(props).forEach(e => elmNode.setProp(e[0], e[1]));
                }

                if (options.id) {
                    elmNode.setProp('id', options.id);
                }

                var styles = options.styles;
                if (styles) {
                    utility.entries(styles).forEach(e => elmNode.setStyle(e[0], e[1]));
                }

                var classes = options.class;
                if (classes) {
                    if (!Array.isArray(classes)) {
                        classes = [classes];
                    }

                    classes.forEach(cls => {
                        if (utility.isObject(cls)) {
                            utility.entries(cls).forEach(e => elmNode.addClass(e[0], e[1]));
                        } else if (utility.isStr(cls) || utility.isFunc(cls)) {
                            elmNode.addClass(cls);
                        }
                    });
                }

                var events = options.events;
                if (events) {
                    utility.entries(events).forEach(([name, handle]) => {
                        if (Array.isArray(handle)) {
                            handle.forEach(f => elmNode.on(name, f));
                        } else {
                            elmNode.on(name, handle);
                        }
                    });
                }
            }
        }

        node.static = utility.getOptionValue(options, 'static', false);

        setElementNodeOptions(node, options);
    }

    _compileEmpty (tpl, ctx) {
        var emptyNode = new VEmpty();

        this._attachNodeContext(emptyNode, tpl.options, ctx);
        this._compileChildren(tpl.children, emptyNode, ctx);

        return emptyNode;
    }

    _compileIf (tpl, ctx) {
        var ifNode = new VIf(tpl.initValue, tpl.children);
        ifNode.cacheNode = utility.getOptionValue(tpl.options, 'cache', false);
        ifNode.ctx = ctx.getNodeContext();
        return ifNode;
    }

    _compileRepeat (tpl, ctx) {
        var repeatNode = new VRepeat(tpl.initValue, utility.getOptionValue(tpl.options, 'key', null), tpl.children);
        this._attachNodeContext(repeatNode, tpl.options, ctx);

        return repeatNode;
    }

    _compileDynamic (tpl, ctx) {
        var dynamicNode = new VDynamic(tpl.initValue);
        dynamicNode.once = utility.getOptionValue(tpl.options, 'once', true);
        dynamicNode.ctx = ctx.getNodeContext();
        return dynamicNode;
    }

    _compileFragment (tpl, ctx) {
        var fragNode = new VFragment(tpl.initValue);
        fragNode.sanitize = utility.getOptionValue(tpl.options, 'sanitize', true);

        return fragNode;
    }

    _compileComponent (tpl, ctx) {
        // create actual component template when deferred arguments present
        if (tpl.$args) {
            var builder = getComponentBuilder(tpl.name);
            if (!builder) {
                throw new Error(`unrecognized component [${tpl.name}]`);
            }

            tpl = builder(...tpl.$args);
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

        var options = !!cdef.options ? mergeNodeOptions(cdef.options, tpl.options) : tpl.options;

        // prepare component template
        var children;
        if (cdef.template) {
            if (Array.isArray(cdef.template)) {
                children = cdef.template;
            } else {
                children = [cdef.template];
            }
        } else {
            // when component has no builtin templates, take template children as its children
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
            componentNode = new VComponent(cdef.name, options);
        }

        // set component name
        componentNode.name = cdef.name;

        // prepare component compile information
        var optionsCtx = utility.getOptionValue(options, 'context', null);
        var transformSlot = cdef.children && cdef.$templateSlot && tpl.children.length > 0;
        var slotChildren = null;

        // init context
        if (cdef.context || optionsCtx) {
            var topCtx = cdef.contextMode == CONTEXT_MODE.INHERIT ? ctx.getNodeContext() : null;
            componentNode.ctx = this._createNodeContext(topCtx, cdef.context, optionsCtx);
        }

        // compile children
        if (transformSlot) {
            // slot transforming at compile phase
            slotChildren = cdef.$templateSlot.children;
            cdef.$templateSlot.children = tpl.children;
        }

        this._compileChildren(children, componentNode, ctx);

        if (transformSlot) {
            cdef.$templateSlot.children = slotChildren;
        }

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
 * @type {CompilerExtension[]}
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

    for (let factory of COMPILER_EXTENSIONS) {
        var extension = utility.isSubclass(factory, CompilerExtension) ? new factory() : factory();
        extension.init(caller);
        compiler.extensions.push(extension);
    }

    if (caller) {
        compiler.initFrom(caller);
    }

    return compiler;
}

/**
 * register compiler extension
 *
 * @param {Function} factory  the extension factory
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