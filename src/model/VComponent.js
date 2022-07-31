import NodeType from './NodeType';
import VNode from './VNode';
import utility from '../service/utility';

import * as NODE from '../service/node';


/**
 * virtual node for generic component
 */
class VComponent extends VNode {
    constructor () {
        super(NodeType.COMPONENT);

        /**
         * name of the component
         * @type {String}
         */
        this.name = '';

        /**
         * reference to the component root node
         * @type {VNode}
         */
        this.node = null;

        /**
         * dynamic property definitions
         */
        this._propDefs = {};
    }

    /**
     * component post initiation method, implemented by derived class
     */
    init () {
        // component initiation
    }

    /**
     * @param {VNode} child  child node
     * @param {Number=} pos  child position index
     */
    addChild (child, pos) {
        this.node.addChild(child, pos);
    }

    /**
     * @param {VNode} node  child node
     * @returns {Boolean}
     */
    removeChild (node) {
        return this.node.removeChild(node);
    }

    /**
     * add a dynamic property
     *
     * @param {String} prop  property name
     * @param {function(VNode):Any=} getter  getter functions
     * @param {Any=} defaultValue  default property value
     */
    setProp (prop, getter, defaultValue) {
        utility.ensureValidString(prop, 'prop');

        this[prop] = defaultValue;

        this._propDefs[prop] = {
            defaultValue: defaultValue,
            getter: utility.isFunction(getter) ? getter : null
        };
    }

    _updateProps () {
        utility.entries(this._propDefs)
            .forEach(([prop, def]) => {
                if (def.getter) {
                    this[prop] = def.getter.call(null, this);
                }
            });
    }

    render () {
        this._updateProps();

        super.render();
        this.domNode = NODE.collectChildDOMNodes(this);
    }
}

export default VComponent;