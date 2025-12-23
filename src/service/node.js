import NodeType from '../model/NodeType';
import VNode from '../model/VNode';

import utility from './utility';
import LOG from './log';


/**
 * tree walk methods
 */
const WALK_METHOD = {
    DFS: 1,
    BFS: 2
};

/**
 * node tree walker
 */
class NodeTreeWalker {
    /**
     * @param {VNode|VNode[]} node   the node(s) to start traversal
     * @param {Number} method   the traverse method
     * @param {(function(VNode):Boolean|Boolean[])=} filter    custom filter
     */
    constructor (node, method, filter) {
        this._queue = Array.isArray(node) ? node.slice(0) : [node];
        this._method = method;
        this._filter = filter;

        this._currentNode = null;
    }

    _checkNode (node) {
        if (this._filter) {
            var result = this._filter.call(null, node);
            if (Array.isArray(result)) {
                return result;
            } else {
                return [!!result, !!result];
            }
        } else {
            return [true, true];
        }
    }

    /**
     * @return {VNode?}
     */
    next () {
        while (this._queue.length > 0) {
            var node = this._queue.shift();
            var [acceptNode, acceptChildren] = this._checkNode(node);

            if (acceptChildren) {
                var children = node.children;
                if (children.length > 0) {
                    if (this._method == WALK_METHOD.DFS) {
                        for (let i = children.length - 1; i >= 0; i--) {
                            this._queue.unshift(children[i]);
                        }
                    } else {
                        for (let child of children) {
                            this._queue.push(child);
                        }
                    }
                }
            }

            if (acceptNode) {
                this._currentNode = node;
                return node;
            }
        }

        this._currentNode = null;
        return null;
    }

    /**
     * @returns {VNode?}
     */
    current () {
        return this._currentNode;
    }

    /**
     * @return {Boolean}
     */
    isEnd () {
        return this._queue.length === 0;
    }
}

NodeTreeWalker.WALK_METHOD = WALK_METHOD;

/**
 * default node iter creation params
 */
function createNodeIterParams () {
    return {
        /**
         * whether traverse the tree by depth first order
         */
        dfs: true,
        /**
         * whether exclude the root node from iteration
         */
        excludeRoot: false
    };
}

/**
 * get an iterator that traverse the given node and its children
 *
 * @param {VNode} node  node on which to start iteration
 * @param {ReturnType<createNodeIterParams>=} params  iterator creation params
 * @param {(function(VNode):Boolean|Boolean[])=} filter    custom filter
 *
 * @returns {NodeTreeWalker}
 */
export function getNodeIter (node, params = null, filter = null) {
    if (utility.isNullOrUndef(node)) {
        throw new Error("node is null");
    }

    if (!(node instanceof VNode)) {
        throw new TypeError("node must be instance of VNode");
    }

    params = utility.extend(createNodeIterParams(), params);

    // create iterator
    var startNode = params.excludeRoot ? node.children : node;
    var iter = new NodeTreeWalker(startNode, params.dfs ? WALK_METHOD.DFS : WALK_METHOD.BFS, filter);

    return iter;
}

/**
 * destroy all nodes
 *
 * @param {VNode[]} nodes
 */
export function destroyNodes (nodes) {
    for (let node of nodes) {
        try {
            node.destroy();
        } catch (err) {
            LOG.error("error when destroying node", err);
        }
    }
}

/**
 * check whether the node can be a dependent reference target
 *
 * @param {VNode} node
 * @returns {Boolean}
 */
export function isDepNode (node) {
    return node.nodeType == NodeType.COMPONENT;
}

/**
 * recursively update node dependent references
 *
 * @param {VNode} node
 * @param {VNode} parent
 */
export function updateNodeDep (node, parent) {
    var dep = isDepNode(parent) ? parent : parent.dep;
    if (node.dep !== dep) {
        node.dep = dep;

        for (let child of node.children) {
            updateNodeDep(child, node);
        }
    }
}

/**
 * check whether child node is a descendent node fo the parent node
 *
 * @param {VNode} node  the node to check
 * @param {VNode} parent  the possible parent node
 *
 * @returns {Boolean}
 */
export function isDescendent (node, parent) {
    if (node === parent) {
        return false;
    }

    while (node) {
        if (node.parent === parent) {
            return true;
        } else {
            node = node.parent;
        }
    }

    return false;
}