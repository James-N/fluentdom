import VNode from './VNode';
import utility from '../service/utility';
import * as NODE from '../service/node';


/**
 * container for virtual node tree
 */
class FluentTree {
    /**
     * @param {VNode} rootNode  the root node
     */
    constructor (rootNode) {
        /**
         * the root node
         * @type {VNode}
         */
        this.root = rootNode;

        /**
         * parent element
         * @type {Element}
         */
        this.parentEl = null;

        /**
         * whether dom nodes yielded by the root node will never changed after rendering
         * @type {Boolean}
         */
        this.fixedRoot = false;
    }

    /**
     * render the tree nodes and update parent dom element
     */
    render () {
        if (this.root) {
            this.root.render();

            if (this.parentEl && !this.fixedRoot) {
                NODE.rearrangeElementChildNodes(this.parentEl, [this.root]);
            }
        }

        return this;
    }

    /**
     * locate and render specified node(s) by aliias
     *
     * @param {String} alias  alias name to identify nodes
     * @param {Boolean=} batch  whether render all matched nodes
     */
    renderNode (alias, batch) {
        if (!!alias && !!this.root) {
            var iter, node;
            if (batch) {
                iter = NODE.getNodeIter(this.root, false, node => node.alias == alias ? [true, false] : [false, true]);
                while (!iter.isEnd()) {
                    node = iter.next();
                    if (node !== null) {
                        node.render();
                    }
                }
            } else {
                iter = NODE.getNodeIter(this.root, false);
                var found = false;
                while (!found && !iter.isEnd()) {
                    node = iter.next();
                    if (node !== null && node.alias == alias) {
                        node.render();
                        found = true;
                    }
                }
            }

            if (this.parentEl && !this.fixedRoot) {
                NODE.rearrangeElementChildNodes(this.parentEl, [this.root]);
            }
        }

        return this;
    }

    _getElement (el, errMsg) {
        if (utility.isNullOrUndef(el)) {
            return null;
        } else if (utility.isStr(el)) {
            var elm = document.querySelector(el);

            if (elm) {
                return elm;
            } else {
                throw new Error(`cannot find element by selector [${el}]`);
            }
        } else if (el instanceof Element || el instanceof DocumentFragment) {
            return el;
        } else {
            throw new TypeError("invalid element input for " + errMsg);
        }
    }

    /**
     * set parent node of fluent tree, the old children of the parent node will be cleaned no matter what
     *
     * @param {Element|DocumentFragment|String|null} parent  parent node
     */
    setParent (parent) {
        var parentEl = this._getElement(parent, 'fluent tree parent');

        if (!!parentEl) {
            // clean old children
            while (parentEl.childNodes.length > 0) {
                parentEl.removeChild(parentEl.childNodes[0]);
            }
        }

        this.parentEl = parentEl;

        return this;
    }

    _getDomNodeList () {
        var dnodes = this.root.domNode;
        return Array.isArray(dnodes) ? dnodes : [dnodes];
    }

    /**
     * append child nodes to the given parent
     *
     * @param {Element|DocumentFragment|String|null} parent  the parent node
     */
    appendTo (parent) {
        var parentEl = this._getElement(parent, 'append operation');
        if (!parentEl) {
            throw new Error("invalid parent to append");
        }

        var fargment = new DocumentFragment();

        for (let node of this._getDomNodeList()) {
            if (node) {
                fargment.appendChild(node);
            }
        }

        parentEl.appendChild(fargment);
        this.parentEl = parentEl;

        return this;
    }

    /**
     * remove child nodes from current parent
     */
    remove () {
        if (this.parentEl) {
            for (let node of this._getDomNodeList()) {
                if (node) {
                    node.remove();
                }
            }

            this.parentEl = null;
        }

        return this;
    }
}

export default FluentTree;