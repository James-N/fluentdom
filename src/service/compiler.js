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
import { CONTEXT_TYPE, getComponent, getComponentBuilder } from './component';
import { getDirective } from './directive';


function getFromNodeOptions (options, opt, defaultValue) {
    if (arguments.length < 3) {
        defaultValue = null;
    }

    if (options !== null && options.hasOwnProperty(opt)) {
        return options[opt];
    } else {
        return defaultValue;
    }
}

function mergeOptions (opt1, opt2) {
    function convertClassOpt (opt) {
        if (Array.isArray(opt)) {
            return opt.reduce((pv, cv) => {
                pv[cv] = true;
                return pv;
            }, {});
        } else if (utility.isObject(opt)) {
            return opt;
        } else if (utility.isString(opt)) {
            return { [opt]: true };
        } else {
            return {};
        }
    }

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
                    opt.class = utility.extend(
                        convertClassOpt(opt.class),
                        convertClassOpt(val)
                    );
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
 * @param {VNode} node
 * @returns {Boolean}
 */
function isDepContextNode (node) {
    return node instanceof VComponent;
}

class CompileContext {
    constructor () {
        this.stack = [];
    }

    pushState () {
        var state = {
            node: null,
            context: null,
            depNode: this.getDepNode()
        };
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
 * default compiler
 */
export class Compiler {
    constructor () {
        this.ctx = new CompileContext();

        /**
         * @type {[x: String]: (tpl: any, ctx: any) => VNode}
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
    }

    /**
     * init internal context of compiler by VNode
     *
     * @param {VNode} node
     */
    initFrom (node) {
        var state = this.ctx.pushState();
        state.node = node;
        state.context = node.ctx;

        if (isDepContextNode(node)) {
            state.depNode = node;
        } else {
            state.depNode = node.dep;
        }
    }

    /**
     * render template into a tree
     *
     * @param {VTemplate} template
     * @returns {VNode}
     */
    compile (template) {
        if (utility.isNullOrUndefined(template)) {
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
            // compile the input template into vnode
            var node = compileFunc.call(this, tpl, ctx);

            // set dependency node
            node.dep = ctx.getDepNode();

            // set basic infos
            this._setNodeBasicInfos(node, tpl.options);

            // register hooks
            this._attachNodeHooks(node, tpl.options);

            // load and run directives
            this._loadNodeDirectives(node, tpl.options);

            // invoke node init hook
            node.invokeHook('nodeInit');

            return node;
        } else {
            throw new TypeError(`unrecognized template of type [${tpl.nodeType}]`);
        }
    }

    _createNodeContext (topCtx, ctxValues) {
        var newCtx;
        if (topCtx) {
            newCtx = Object.create(topCtx);
        } else {
            newCtx = {};
        }

        utility.extend(newCtx, ctxValues);

        return newCtx;
    }

    _attachNodeContext (node, options, compileCtx) {
        var context = getFromNodeOptions(options, 'context', null);
        if (context) {
            node.ctx = this._createNodeContext(compileCtx.getNodeContext(), options.context);
        } else {
            node.ctx = compileCtx.getNodeContext();
        }
    }

    _setNodeBasicInfos (node, options) {
        var alias = getFromNodeOptions(options, 'alias', '');
        if (alias) {
            node.alias = alias;
        }
    }

    _attachNodeHooks (node, options) {
        var hooks = getFromNodeOptions(options, 'hooks', null);
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
        var state = ctx.pushState();
        state.node = node;
        state.context = node.ctx;

        if (isDepContextNode(node)) {
            state.depNode = node;
        }

        children = children.slice(0);
        while (children.length > 0) {
            var child = children.shift();
            if (child instanceof VSlotTemplate) {
                child.children.forEach(c => children.unshift(c));
            } else {
                var childNode = this._compileTemplate(child, ctx);
                if (node instanceof VComponent) {
                    // direct child of VComponent must be treated differently
                    // since its `addChild` is overwritten
                    node.children.push(childNode);
                    childNode.parent = node;
                } else {
                    node.addChild(childNode);
                }
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
                    if (Array.isArray(classes)) {
                        classes.forEach(cls => elmNode.addClass(cls));
                    } else if (utility.isObject(classes)) {
                        utility.entries(classes).forEach(e => elmNode.addClass(e[0], e[1]));
                    } else if (utility.isString(classes) || utility.isFunction(classes)) {
                        elmNode.addClass(classes);
                    }
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

        var options = tpl.options;
        var domNode = getFromNodeOptions(options, 'domNode');

        var elmNode;
        if (domNode && utility.isElementNode(domNode)) {
            // bind velement with the given dom element node, should be used with care
            elmNode = new VElement(domNode.tagName);
            elmNode.domNode = domNode;
        } else {
            elmNode = new VElement(tpl.initValue);
        }

        elmNode.static = getFromNodeOptions(options, 'static', false);

        this._attachNodeContext(elmNode, options, ctx);
        setElementNodeOptions(elmNode, options);
        this._compileChildren(tpl.children, elmNode, ctx);

        return elmNode;
    }

    _compileEmpty (tpl, ctx) {
        var emptyNode = new VEmpty();

        this._attachNodeContext(emptyNode, tpl.options, ctx);
        this._compileChildren(tpl.children, emptyNode, ctx);

        return emptyNode;
    }

    _compileIf (tpl, ctx) {
        var ifNode = new VIf(tpl.initValue, tpl.children);
        ifNode.cacheNode = getFromNodeOptions(tpl.options, 'cache', true);
        ifNode.ctx = ctx.getNodeContext();
        return ifNode;
    }

    _compileRepeat (tpl, ctx) {
        var repeatNode = new VRepeat(tpl.initValue, getFromNodeOptions(tpl.options, 'key', null), tpl.children);
        this._attachNodeContext(repeatNode, tpl.options, ctx);

        return repeatNode;
    }

    _compileDynamic (tpl, ctx) {
        var dynamicNode = new VDynamic(tpl.initValue);
        dynamicNode.once = getFromNodeOptions(tpl.options, 'once', true);
        dynamicNode.ctx = ctx.getNodeContext();
        return dynamicNode;
    }

    _compileFragment (tpl, ctx) {
        return new VFragment(tpl.initValue);
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

        var options = !!cdef.options ? mergeOptions(cdef.options, tpl.options) : tpl.options;

        // prepare component template
        var rootTpl = new VTemplate(NodeType.ELEMENT, tpl.name, options);
        if (cdef.template) {
            if (Array.isArray(cdef.template)) {
                rootTpl.children = cdef.template;
            } else {
                rootTpl.children.push(cdef.template);
            }
        } else {
            // when component has no builtin templates, take template children as its children
            if (cdef.acceptChildren && tpl.children.length > 0) {
                rootTpl.children = tpl.children;
            }
        }

        // create component node
        var componentNode, postInitializer = null;
        if (utility.isFunction(cdef.nodeClass)) {
            if (utility.isSubclass(cdef.nodeClass, VComponent)) {
                componentNode = new cdef.nodeClass(...tpl.initValue);
            } else {
                componentNode = new VComponent();
                postInitializer = cdef.nodeClass;
            }
        } else {
            componentNode = new VComponent();
        }

        // set component name
        componentNode.name = cdef.name;

        // prepare component compile information
        var optionsCtx = getFromNodeOptions(options, 'context', null);
        var transformSlot = cdef.acceptChildren && cdef.$templateSlot && tpl.children.length > 0;
        var slotChildren = null;

        // init context
        if (cdef.context || optionsCtx) {
            var topCtx = cdef.context == CONTEXT_TYPE.INHERIT ? ctx.getNodeContext() : null;
            componentNode.ctx = this._createNodeContext(topCtx, cdef.context);

            if (optionsCtx) {
                utility.extend(componentNode.ctx, optionsCtx);
            }
        }

        // compile children
        if (optionsCtx) {
            options.context = null;     // prevent root template from creating new context
        }

        if (transformSlot) {
            // slot transforming at compile phase
            slotChildren = cdef.$templateSlot.children;
            cdef.$templateSlot.children = tpl.children;
        }

        this._compileChildren([rootTpl], componentNode, ctx);

        if (optionsCtx) {
            options.context = optionsCtx;
        }

        if (transformSlot) {
            cdef.$templateSlot.children = slotChildren;
        }

        // set component root node
        componentNode.node = componentNode.children[0];

        // set dynamic properties
        var props = getFromNodeOptions(options, 'nodeProps', null);

        utility.entries(cdef.props)
            .forEach(([prop, val]) => {
                if (props.hasOwnProperty(prop)) {
                    var nodePropVal = props[prop];
                    if (utility.isFunction(nodePropVal)) {
                        componentNode.setProp(prop, nodePropVal, val);
                    } else {
                        componentNode.setProp(prop, null, nodePropVal);
                    }
                } else {
                    componentNode.setProp(prop, null, val);
                }
            });

        // invoke component init method and post initializer if exists
        try {
            componentNode.init();
        } catch (err) {
            LOG.error(`error inside \`init\` method of component [${componentNode.name}]`, err);
        }

        if (postInitializer) {
            try {
                postInitializer(componentNode, ...tpl.initValue);
            } catch (err) {
                LOG.error(`error inside initializer function of component [${componentNode.name}]`, err);
            }
        }

        return componentNode;
    }
}

/**
 * compile the given template
 *
 * @param {VTemplate} template
 * @returns {VNode}
 */
export function compile (template) {
    var compiler = new Compiler();
    return compiler.compile(template);
}