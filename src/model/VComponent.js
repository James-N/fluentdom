import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import EventTable from './internal/EventTable';


/**
 * virtual node for generic component
 */
class VComponent extends VNode {
    /**
     * @param {String} name  component name
     */
    constructor (name) {
        super();

        this.nodeType = NodeType.COMPONENT;

        /**
         * component type name
         * @type {String}
         */
        this.name = name || '';

        /**
         * component events
         */
        this._events = new EventTable('VComponent::events');
    }

    /**
     * generate component template
     *
     * @virtual
     *
     * @returns {VTemplate|VTemplate[]|null}
     */
    template () {
        return null;
    }

    /**
     * component post initialization method, implemented by derived class
     *
     * @virtual
     */
    init () {
        // component post-initialization
    }

    /**
     * register event
     *
     * @param {String} name  evnet name
     * @param {Function} handler  the event handler function
     * @param {Record<String, Boolean>=} flags  event flags
     */
    on (name, handler, flags) {
        this._events.add(name, handler, flags);
    }

    /**
     * deregister event
     *
     * @param {String} name  event name
     * @param {Function=} handler  the event handler function to remove
     */
    off (name, handler) {
        this._events.remove(name, handler);
    }

    /**
     * emit event
     *
     * @param {String} name  event name
     * @param  {...any} args  event arguments
     */
    emit (name, ...args) {
        this._events.invoke(name, this, ...args);
    }
}

export default VComponent;