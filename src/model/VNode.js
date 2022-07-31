import HookMessage from './HookMessage';

import * as NODE from '../service/node';
import LOG from '../service/log';
import utility from '../service/utility';


/**
 * base class of all virtual node
 */
class VNode {
    /**
     * @param {String} nodeType  type of node
     */
    constructor (nodeType) {
        /**
         * type of node
         * @type {String}
         */
        this.nodeType = nodeType;
        /**
         * the actual dom node
         * @type {Node|Node[]}
         */
        this.domNode = null;

        /**
         * context bound with virtual node
         * @type {Object}
         */
        this.ctx = null;

        /**
         * reference to the parent virtual node
         * @type {VNode}
         */
        this.parent = null;
        /**
         * list of child virtual nodes
         * @type {VNode[]}
         */
        this.children = [];
        /**
         * the component or bound container this node belongs to
         * @type {VNode}
         */
        this.dep = null;

        /**
         * optional alias name of the node for node retrieval
         * @type {String}
         */
        this.alias = '';

        /**
         * hook registration
         * @type {Map<String, Function[]}
         */
         this._hooks = {};
    }

    /**
     * add a child node
     *
     * @param {VNode} node  the child node to add
     * @param {Number=} index  child position index
     */
    addChild (node, index) {
        if (utility.isNullOrUndefined(node)) {
            throw new Error("child node is null");
        }

        if (!(node instanceof VNode)) {
            throw new TypeError("child node must be VNode");
        }

        if (index >= 0) {
            this.children.splice(index, 0, node);
        } else {
            this.children.push(node);
        }

        node.parent = this;
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
            this.children.splice(idx, 1);
            node.parent = null;
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
            var child = this.children[index];
            this.children.splice(index, 1);
            child.parent = null;

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
     * generate or update corresponding dom node
     */
    render () {
        // invoke render of all children
        this.children.forEach(c => {
            try {
                c.render();
            } catch (err) {
                LOG.error('error when rendering child node', err);
            }
        });
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
     */
    hook (name, hook) {
        utility.ensureValidString(name, 'hook name');

        if (!utility.isFunction(hook)) {
            throw new TypeError("hook must be function");
        }

        var hooks = this._hooks[name];
        if (!hooks) {
            hooks = [];
            this._hooks[name] = hooks;
        }

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
            if (utility.isNullOrUndefined(hook)) {
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
        var hooks = this._hooks[name];

        if (hooks && hooks.length > 0) {
            msg = msg || new HookMessage(this);

            for (var i = 0; i < hooks.length; i++) {
                try {
                    args.length > 0 ? hooks[i].call(null, msg, ...args) : hooks[i].call(null, msg);
                } catch (err) {
                    LOG.error(`error inside hook callback [${name}]`, err);
                }
            }
        }
    }
}

export default VNode;