import VNode from "./VNode";


/**
 * message object pass through hooks
 */
class HookMessage {
    /**
     * @param {VNode} srcNode  root node that triggers the hook
     */
    constructor (srcNode) {
        /**
         * the source vnode
         * @type {VNode}
         */
        this.src = srcNode;

        /**
         * custom data attached to the message
         * @type {any}
         */
        this.data = null;

        /**
         * whether this message should be broadcasted to child nodes
         * @type {Boolean}
         */
        this.broadcast = false;
    }
}

export default HookMessage;