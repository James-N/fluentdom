import VNode from './VNode';

import utility from '../service/utility';


/**
 * message object pass through hooks
 */
class HookMessage {
    /**
     * @param {VNode} srcNode  root node that triggers the hook
     * @param {Record<String, any>=} properties  optional message properties set
     */
    constructor (srcNode, properties) {
        /**
         * the source vnode
         * @type {VNode}
         */
        this.src = srcNode;

        /**
         * custom data attached to the message
         * @type {any}
         */
        this.data = utility.getOptionValue(properties, 'data', null);

        /**
         * whether this message should be broadcasted to child nodes
         * @type {Boolean}
         */
        this.broadcast = !!utility.getOptionValue(properties, 'broadcast', false);
    }
}

export default HookMessage;