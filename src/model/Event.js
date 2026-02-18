import VNode from './VNode';


/**
 * general virtual node events
 */
class Event {
    /**
     * @param {VNode} src  the source node
     */
    constructor (src) {
        /**
         * the event source object
         *
         * @type {VNode}
         */
        this.src = src;

        /**
         * dispatch flag
         */
        this.$dispatch = false;

        /**
         * broadcast flag
         */
        this.$broadcast = false;
    }

    /**
     * stop event from propagation
     */
    stopPropagation () {
        this.$dispatch = false;
        this.$broadcast = false;
    }
}

export default Event;