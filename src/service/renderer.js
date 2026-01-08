import VNode from '../model/VNode';

import * as NODE from './node';
import * as DOM from './dom';
import LOG from './log';
import { emptyNode } from './dom';
import utility from './utility';


/**
 * recursively render virtual node tree
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

        for (let child of node.children) {
            computeNodeTree(child);
        }
    }

    /**
     * @typedef {ReturnType<createNodeSegment>} NodeSegment
     */

    /**
     * @param {Boolean} reflow
     */
    function createNodeSegment (reflow) {
        return {
            /**
             * segment is reflow
             * @type {Boolean}
             */
            reflow: reflow,
            /**
             * segment nodes
             * @type {VNode[]}
             */
            nodes: []
        };
    }

    /**
     * collect the closest descendant nodes of the given node that have DOM nodes,
     * and segmentize the node list by reflow flag
     *
     * @param {VNode} rootNode
     * @returns {NodeSegment[]}
     */
    function segmentizeClosestDescendantNodesWithDOM (rootNode) {
        /**
         * @param {VNode} node
         * @param {Boolean} reflow
         * @param {NodeSegment[]} segments
         */
        function collect (node, reflow, segments) {
            var shouldReflow = reflow || node.$flags.reflow;    // if a node is marked as `reflow`, all its descendants will all be marked as well
            if (node.domNode) {
                // only nodes with dom nodes will be collected
                var seg = utility.lastArrItem(segments, null);
                if (seg && seg.reflow === shouldReflow) {
                    seg.nodes.push(node);
                } else {
                    seg = createNodeSegment(shouldReflow);
                    seg.nodes.push(node);
                    segments.push(seg);
                }
            } else {
                for (let child of node.children) {
                    collect(child, shouldReflow, segments);
                }
            }
        }

        var segments = [];
        for (let node of rootNode.children) {
            collect(node, false, segments);
        }

        return segments;
    }

    /**
     * fetch the first DOM node from list of virtual nodes
     *
     * @param {VNode} node
     * @returns {Node}
     */
    function fetchFirstDOMNode (node) {
        return utility.isArr(node.domNode) ? node.domNode[0] : node.domNode;
    }

    /**
     * merge DOM nodes of given virtual nodes into single list
     *
     * @param {VNode[]} nodes
     * @returns {Node[]}
     */
    function flattenDOMNodes (nodes) {
        var domList = [];
        for (let node of nodes) {
            if (utility.isArr(node.domNode)) {
                domList.push(...node.domNode);
            } else {
                domList.push(node.domNode);
            }
        }

        return domList;
    }

    /**
     * merge DOM nodes of given virtual nodes into single document fragment
     *
     * @param {VNode[]} nodes
     * @returns {DocumentFragment}
     */
    function collectDOMNodes2Segment (nodes) {
        var fragment = DOM.createFragment();

        for (let node of nodes) {
            if (utility.isArr(node.domNode)) {
                for (let dom of node.domNode) {
                    fragment.appendChild(dom);
                }
            } else {
                fragment.appendChild(node.domNode);
            }
        }

        return fragment;
    }

    /**
     * keep removing DOM nodes in NodeList until meet the target node,
     * pass in `null` as target node will remove all remaining DOM nodes
     *
     * @param {Node} current
     * @param {Node?} target
     *
     * @returns {Boolean}  whether the target node is found
     */
    function removeDOMNodeUntil (current, target) {
        while (current && current !== target) {
            var next = current.nextSibling;
            current.remove();
            current = next;
        }

        return current === target;
    }

    /**
     * synchronize existing DOM NodeList from specified node with nodes collected from a set of virtual nodes without `reflow` mark,
     * this function will remove unmatched nodes from DOM, but will not try to fix other problems
     *
     * @param {Node} domNode  the start DOM node to synchronize
     * @param {Node[]} nodes  list of reference DOM nodes
     *
     * @returns {Node?}  the next DOM node to read from
     */
    function syncUnflowDOMNodes (domNode, refNodes) {
        if (domNode) {
            var parent = domNode.parentNode;

            for (var n = 0; n < refNodes.length && domNode; n++) {
                if (removeDOMNodeUntil(domNode, refNodes[n])) {
                    domNode = domNode.nextSibling;
                } else {
                    LOG.warn("DOM node structure mismatch, rendering result maybe incorrect", parent);
                }
            }

            return domNode;
        } else {
            LOG.warn("DOM node structure mismatch, rendering result maybe incorrect");
            return null;
        }
    }

    /**
     * batch invoke `syncDOM` on given nodes
     *
     * @param {VNode[]} nodes
     */
    function batchSyncDOM (nodes) {
        for (let node of nodes) {
            syncDOM(node);
        }
    }

    /**
     * recursively reconstruct DOM structure to match the virtual node tree
     *
     * @param {VNode} node
     */
    function syncDOM (node) {
        // nodes with `endpoint` flag are excluded from DOM synchronization process
        if (node.$flags.endpoint) {
            return;
        }

        if (node.domNode) {
            // collect & segmentize descendant nodes by reflow flag, we will perform a simple linear scan-and-update
            // instead of more complex diff operation between the segment list and old DOM nodes to mutate the DOM structure
            // into the expected shape
            var nodeSegments = segmentizeClosestDescendantNodesWithDOM(node);
            var reflow = nodeSegments.some(s => s.reflow);

            // decide the DOM node to synchronize
            var curDOMNode = fetchFirstDOMNode(node);

            if (reflow) {
                if (nodeSegments.length > 1) {
                    var curDOMChild = curDOMNode.firstChild;    // forward-only pointer to old DOM nodes
                    for (var i = 0; i < nodeSegments.length; i++) {
                        var curSeg = nodeSegments[i];
                        if (curSeg.reflow) {
                            // for reflowed segment, take next un-reflowed node or end of node list as the anchor point,
                            // then we remove all DOM nodes between current pointer and the anchor point
                            var nextSeg = nodeSegments[i + 1] || null;
                            var nextUnflowDOMChild = nextSeg ? fetchFirstDOMNode(nextSeg.nodes[0]) : null;
                            if (removeDOMNodeUntil(curDOMChild, nextUnflowDOMChild)) {
                                curDOMChild = nextUnflowDOMChild;
                            } else {
                                // when fall into this branch, it means the DOM nodes are unsynchronized with the un-reflowed node,
                                // which shall never happen under normal circumstances
                                curDOMChild = null;
                            }

                            batchSyncDOM(curSeg.nodes);

                            // insert DOM nodes from the reflowed segment into DOM tree
                            var fragment = collectDOMNodes2Segment(curSeg.nodes);
                            if (curDOMChild) {
                                curDOMNode.insertBefore(fragment, curDOMChild);
                            } else {
                                curDOMNode.appendChild(fragment);
                            }
                        } else {
                            // we can't just take the old DOM when it comes to un-reflowed segment, since some nodes may be
                            // removed after previous computing and remain the surrounding nodes un-reflowed, so an extra
                            // synchronization is necessary to detect these changes
                            curDOMChild = syncUnflowDOMNodes(curDOMChild, flattenDOMNodes(curSeg.nodes));

                            batchSyncDOM(curSeg.nodes);
                        }
                    }

                    // remove remaining unmatched DOM nodes
                    if (curDOMChild) {
                        removeDOMNodeUntil(curDOMChild, null);
                    }
                } else {
                    emptyNode(curDOMNode);

                    // if there is only one single reflowed segment, use collected new DOM nodes to replace old DOM nodes directly
                    if (nodeSegments.length > 0) {
                        batchSyncDOM(nodeSegments[0].nodes);
                        curDOMNode.appendChild(collectDOMNodes2Segment(nodeSegments[0].nodes));
                    }
                }
            } else {
                if (nodeSegments.length > 0) {
                    // if there is only one single un-reflowed segment, we may also need to perform the extra synchronization,
                    // a simple length comparsion should be enough here, since any changes other than removing will lead to at
                    // least two segments
                    var unflowDOMNodes = flattenDOMNodes(nodeSegments[0].nodes);
                    if (curDOMNode.childNodes.length != unflowDOMNodes.length) {
                        var nextChild = syncUnflowDOMNodes(curDOMNode.firstChild, unflowDOMNodes);
                        if (nextChild) {
                            removeDOMNodeUntil(nextChild, null);
                        }
                    }

                    batchSyncDOM(nodeSegments[0].nodes);
                } else {
                    emptyNode(curDOMNode);
                }
            }
        } else {
            batchSyncDOM(node.children);
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

    // compute node tree recursively
    computeNodeTree(node);
    // sync DOM tree from given node or its closest ancestor node that has DOM node(s)
    syncDOM(NODE.findAnsestorNode(node, n => !!n.domNode) || node);
    // reset node states recursively
    resetNodeStates(node);
}