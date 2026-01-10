import NodeType from './NodeType';
import HookMessage from './HookMessage';
import EventTable from './internal/EventTable';

import * as NODE from '../service/node';
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
         * list of directives attached to this node
         *
         * @type {import('../service/directive').Directive[]}
         */
        this.directives = [];

        /**
         * hook registration
         */
        this._hooks = new EventTable('VNode::hook');

        /**
         * node flag table, this attribute shall only be accessed by internal functions
         */
        this.$flags = {
            /**
             * DOM structure related to this node need to be re-synced
             */
            reflow: false,

            /**
             * mark this node to be the last hierarchy for DOM reconstruction, during rendering process,
             * child nodes of this node will still be computed but excluded from DOM synchronization, how
             * the child DOM nodes are constructed are fully controlled by implementation of this node
             */
            endpoint: false,
        };
    }

    /**
     * add a child node and update its reference attributes
     *
     * @param {VNode} node  the child node to add
     * @param {Number=} index  child position index
     * @param {Boolean=} safe  perform additional safety checking & operation before adding child
     */
    addChild (node, index, safe) {
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

        // destroy all directives
        for (let directive of this.directives) {
            directive.destroy();
        }

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
     * @param {Function} handler  the hook handler function
     * @param {Record<String, Boolean>=} flags  hook flags
     */
    hook (name, handler, flags) {
        utility.ensureValidString(name, 'hook name');

        if (!utility.isFunc(handler)) {
            throw new TypeError("hook handler must be function");
        }

        this._hooks.add(name, handler, flags);
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
        return this._hooks.remove(name, hook);
    }

    /**
     * invoke hook handler
     *
     * @param {String} name  hook name
     * @param {HookMessage|Record<String, any>?=} msg  an optional pre-generated hook message
     * @param  {...any} args  additional args
     */
    invokeHook (name, msg, ...args) {
        // valid & construct hook message if necessary
        if (!(msg instanceof HookMessage)) {
            if (utility.isNullOrUndef(msg)) {
                msg = new HookMessage(this);
            } else if (utility.isStrictObj(msg)) {
                msg = new HookMessage(this, msg);
            } else {
                throw new TypeError("invalid hook msg type");
            }
        }

        // invoke hook on this node
        this._hooks.invoke(name, this, msg, ...args);

        // broadcast message to child nodes if necessary
        if (msg.broadcast) {
            this.children.forEach(c => c.invokeHook(name, msg, ...args));
        }
    }
}

export default VNode;