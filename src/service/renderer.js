import VNode from '../model/VNode';

import * as NODE from './node';
import * as DOM from './dom';
import LOG from './log';
import { emptyNode } from './dom';


/**
 * recursively render node tree
 *
 * @param {VNode} node  root of the node tree to render
 */
export function renderNodeTree (node) {
    /**
     * @param {VNode} node
     */
    function computeNodeTree (node) {
        try {
            node.compute();
        } catch (err) {
            LOG.error(`error when computing node: ${node.nodeType}`, err);
            return;
        }

        if (!node.$flags.endpoint) {
            for (let child of node.children) {
                computeNodeTree(child);
            }
        }
    }

    /**
     * @param {VNode} node
     * @returns {[Boolean, VNode[]]}  [has reflow, list of nodes]
     */
    function collectDescendantNodesWithDOM (node) {
        var nodeIter = NODE.getNodeIter(node, { dfs: true, excludeRoot: true }, n => [true, !n.domNode]);

        var nodesFound = [];
        var reflow = false;

        while (!nodeIter.isEnd()) {
            let n = nodeIter.next();
            if (n.$flags.reflow) {
                reflow = true;
            }

            if (n.domNode) {
                nodesFound.push(n);
            }
        }

        return [reflow, nodesFound];
    }

    /**
     * get the closest ansestor node that has DOM nodes
     *
     * @param {VNode} node
     * @returns {VNode?}
     */
    function findAnsestorNodeWithDOM (node) {
        while (node && !node.domNode) {
            node = node.parent;
        }

        return node;
    }

    /**
     * recursively update DOM structure
     *
     * @param {VNode} node
     */
    function syncDom (node) {
        if (node.$flags.endpoint) {
            return;
        }

        if (node.domNode) {
            // collect nearest descendent nodes with DOM nodes and check whether any nodes on the path has reflow flag set
            var [reflow, nodes] = collectDescendantNodesWithDOM(node);

            if (reflow) {
                // find DOM node to update
                var domNode = Array.isArray(node.domNode) ? node.domNode[0] : node.domNode;

                // clear child list of current DOM node
                emptyNode(domNode);

                if (nodes.length > 0) {
                    var fragment = DOM.createFragment();

                    for (let child of nodes) {
                        syncDom(child);

                        // collect direct child DOM nodes
                        if (Array.isArray(child.domNode)) {
                            for (let cDomNode of child.domNode) {
                                fragment.appendChild(cDomNode);
                            }
                        } else {
                            fragment.appendChild(child.domNode);
                        }
                    }

                    // append child DOM nodes to current DOM node
                    domNode.appendChild(fragment);
                }
            } else {
                for (let child of nodes) {
                    syncDom(child);
                }
            }
        } else {
            for (let child of node.children) {
                syncDom(child);
            }
        }
    }

    /**
     * @param {VNode} node
     */
    function resetNodeStates (node) {
        var iter = NODE.getNodeIter(node);
        while (!iter.isEnd()) {
            let n = iter.next();
            n.$flags.reflow = false;
        }
    }

    // compute node tree
    computeNodeTree(node);
    // sync DOM tree
    syncDom(findAnsestorNodeWithDOM(node) || node);
    // reset states
    resetNodeStates(node);
}