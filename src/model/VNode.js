import NodeType from './NodeType';
import HookMessage from './HookMessage';

import * as NODE from '../service/node';
import LOG from '../service/log';
import utility from '../service/utility';
import { renderNodeTree } from '../service/renderer';


/**
 * base class of all virtual node types, this class shall not be instantiated directly
 *
 * @abstract
 */
class VNode {
    constructor () {
        /**
         * type of node
         * @type {NodeType}
         */
        this.nodeType = '';

        /**
         * the actual dom node(s)
         * @type {Node|Node[]?}
         */
        this.domNode = null;

        /**
         * context bound with virtual node
         * @type {Record<String, any>?}
         */
        this.ctx = null;

        /**
         * reference to the parent virtual node
         * @type {VNode?}
         */
        this.parent = null;

        /**
         * list of child virtual nodes
         * @type {VNode[]}
         */
        this.children = [];

        /**
         * the component or bound container this node belongs to
         * @type {VNode?}
         */
        this.dep = null;

        /**
         * optional alias name of the node for node retrieval
         * @type {String}
         */
        this.alias = '';

        /**
         * hook registration
         * @type {Record<String, Function[]>}
         */
        this._hooks = {};

        /**
         * node flag table, this attribute shall only be accessed by internal functions
         */
        this.$flags = {
            /**
             * DOM structure related to this node need to be re-synced
             */
            reflow: false,

            /**
             * mark this node should always be a leaf node in node tree
             */
            endpoint: false,
        };
    }

    /**
     * add a child node and update its reference attributes
     *
     * @param {VNode} node  the child node to add
     * @param {Number=} index  child position index
     * @param {Boolean=} safe  perform additional safety checking & operation before addind child
     */
    addChild (node, index, safe) {
        if (this.$flags.endpoint) {
            throw new Error("cannot add child to an endpoint node");
        }

        if (utility.isNullOrUndef(node)) {
            throw new Error("child node is null");
        }

        if (!(node instanceof VNode)) {
            throw new TypeError("child node must be VNode");
        }

        if (node.nodeType == NodeType.TREE) {
            throw new Error(`cannot add node of type ${NodeType.TREE} as child`);
        }

        if (safe) {
            if (NODE.isDescendent(this, node)) {
                throw new Error("cannot add an ancestor node as child");
            }

            if (node.parent) {
                node.remove();
            }
        }

        // insert child node
        if (index >= 0) {
            this.children.splice(index, 0, node);
        } else {
            this.children.push(node);
        }

        // update parent & dep reference
        node.parent = this;
        NODE.updateNodeDep(node, this);

        // set reflow flag
        this.$flags.reflow = true;
    }

    /**
     * remove a child node
     *
     * @param {VNode} node  the child node to remove
     * @returns {Boolean}
     */
    removeChild (node) {
        var idx = this.children.indexOf(node);
        if (idx >= 0) {
            // remove child node
            this.children.splice(idx, 1);

            // clear parent reference
            node.parent = null;

            // set reflow flag
            this.$flags.reflow = true;

            return true;
        } else {
            return false;
        }
    }

    /**
     * remove child at specific index
     *
     * @param {Number} index  child index
     * @returns {VNode?}
     */
    removeChildAt (index) {
        if (index >= 0 && index < this.children.length) {
            // remove child node
            var child = this.children[index];
            this.children.splice(index, 1);

            // clear parent reference
            child.parent = null;

            // set reflow flag
            this.$flags.reflow = true;

            return child;
        } else {
            return null;
        }
    }

    /**
     * remove this node from its parent
     *
     * @param {Boolean=} destroy  whether destroy this node after removing
     */
    remove (destroy = false) {
        if (this.parent) {
            this.parent.removeChild(this);
        }

        if (destroy) {
            this.destroy();
        }
    }

    /**
     * evaluate and update node properties, children, DOM nodes, etc., should be overrided by derived types
     *
     * @virtual
     */
    compute () {
        return;
    }

    /**
     * recursively compute all nodes within the subtree rooted by current node, and update the affected part of DOM tree
     */
    render () {
        renderNodeTree(this);
    }

    /**
     * locate and render specified node(s) within the subtree rooted by current node by aliias
     *
     * @param {String} alias  alias name to identify nodes
     * @param {Boolean=} batch  whether render all matched nodes
     */
    renderNode (alias, batch) {
        utility.ensureValidString(alias, 'alias');

        var iter, node;
        if (batch) {
            iter = NODE.getNodeIter(this, { dfs: false }, node => node.alias == alias ? [true, false] : [false, true]);
            while (!iter.isEnd()) {
                node = iter.next();
                if (node) {
                    renderNodeTree(node);
                }
            }
        } else {
            iter = NODE.getNodeIter(this, { dfs: false });
            while (!iter.isEnd() && iter.next().alias != alias) { }

            node = iter.current();
            if (node) {
                renderNodeTree(node);
            }
        }
    }

    /**
     * destroy node
     */
    destroy () {
        // destroy all children
        NODE.destroyNodes(this.children);

        // reset internal states
        this.parent = null;
        this.domNode = null;

        // invoke destroy hooks
        this.invokeHook('destroy');
    }

    /**
     * register hook function
     *
     * @param {String} name  hook name
     * @param {Function} hook  the hook function
     * @param {Record<String, Boolean>=} flags  hook flags
     */
    hook (name, hook, flags) {
        utility.ensureValidString(name, 'hook name');

        if (!utility.isFunc(hook)) {
            throw new TypeError("hook must be function");
        }

        // attach flags to hook function
        if (flags) {
            if (flags.once) {
                hook.$once = true;
            }
        }

        // create hook set
        var hooks = this._hooks[name];
        if (!hooks) {
            hooks = [];
            this._hooks[name] = hooks;
        }

        // add hook function to set
        hooks.push(hook);
    }

    /**
     * unregister hook function
     *
     * @param {String} name  hook name
     * @param {Function=} hook  the hook function
     *
     * @returns {Boolean}
     */
    unhook (name, hook) {
        var hooks = this._hooks[name];
        if (hooks) {
            if (utility.isNullOrUndef(hook)) {
                delete this._hooks[name];
                return true;
            } else {
                var idx = hooks.indexOf(hook);
                if (idx >= 0) {
                    hooks.splice(idx, 1);

                    if (hooks.length === 0) {
                        delete this._hooks[name];
                    }

                    return true;
                } else {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    /**
     * invoke hook callback
     *
     * @param {String} name  hook name
     * @param {HookMessage?=} msg  the optional hook message
     * @param  {...any} args  additional args
     */
    invokeHook (name, msg, ...args) {
        if (msg && !(msg instanceof HookMessage)) {
            throw new TypeError("invalid hook msg type");
        }

        msg = msg || new HookMessage(this);

        var hooks = this._hooks[name];
        if (hooks && hooks.length > 0) {
            for (var i = 0; i < hooks.length; i++) {
                var hook = hooks[i];
                try {
                    hook.call(null, msg, ...args);
                } catch (err) {
                    LOG.error(`error inside hook callback [${name}]`, err);
                }

                // remove hook with the `once` flag after invocation
                if (hook.$once) {
                    hooks.splice(i, 1);
                    i--;
                }
            }
        }

        // broadcast message to child nodes if necessary
        if (msg.broadcast) {
            this.children.forEach(c => c.invokeHook(name, msg, ...args));
        }
    }
}

export default VNode;