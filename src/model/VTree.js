import NodeType from './NodeType';
import LifecycleEvents from '../enum/LifecycleEvents';
import VNode from './VNode';

import utility from '../service/utility';
import * as DOM from '../service/dom';
import { emptyNode } from '../service/dom';


/**
 * bridge between virtual node tree and DOM tree
 */
class VTree extends VNode {
    constructor () {
        super();

        this.nodeType = NodeType.TREE;
    }

    render () {
        super.render();
    }

    _fetchMountingElm (el) {
        if (utility.isStr(el)) {
            var elm = DOM.query(el);
            if (elm) {
                return elm;
            } else {
                throw new Error(`cannot find mounting element by selector [${el}]`);
            }
        } else if (utility.isElementNode(el) || utility.isDocumentFragment(el)) {
            return el;
        } else {
            throw new TypeError("invalid mounting element input for VTree");
        }
    }

    /**
     * attach virtual node tree into DOM tree through specified element,
     * the old children of the element will be cleaned no matter what
     *
     * @param {Element|DocumentFragment|String} el  the element to mount
     * @param {Boolean=} render  whether to trigger rendering after mount
     */
    mount (el, render = true) {
        if (utility.isNullOrUndef(el)) {
            throw new Error("el is null");
        }

        // unmount old element if necessary
        if (this.domNode) {
            this.unmount();
        }

        // get mounting element
        var mountEl = this._fetchMountingElm(el);
        // clean old children
        emptyNode(mountEl);
        // save mount element to `domNode` property
        this.domNode = mountEl;

        // trigger rendering if necessary
        if (render) {
            this.render();
        }

        // trigger `MOUNTED` event
        this.emit(LifecycleEvents.MOUNTED, { broadcast: true });
    }

    /**
     * check whether this tree is mounted
     *
     * @returns {Boolean}
     */
    isMounted () {
        return !!this.domNode;
    }

    /**
     * remove virtual node tree from DOM tree
     */
    unmount () {
        if (this.domNode) {
            emptyNode(this.domNode);
            this.domNode = null;

            // trigger `UNMOUNTED` event
            this.emit(LifecycleEvents.UNMOUNTED, { broadcast: true });
        }
    }
}

export default VTree;