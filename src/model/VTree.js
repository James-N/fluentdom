import NodeType from './NodeType';
import VNode from './VNode';
import utility from '../service/utility';
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

    _getElement (el) {
        if (utility.isStr(el)) {
            var elm = document.querySelector(el);

            if (elm) {
                return elm;
            } else {
                throw new Error(`cannot find element by selector [${el}]`);
            }
        } else if (el instanceof Element || el instanceof DocumentFragment) {
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

        // get mounting element
        var mountEl = this._getElement(el);
        // clean old children
        emptyNode(mountEl);
        // save mount element to `domNode` property
        this.domNode = mountEl;

        // trigger rendering if necessary
        if (render) {
            this.render();
        }

        // invoke mount hook
        this.invokeHook('mounted');
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

            // invoke unmount hook
            this.invokeHook('unmounted');
        }
    }
}

export default VTree;