import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';


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
}

export default VComponent;