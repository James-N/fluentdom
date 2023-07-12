import NodeType from './NodeType';
import VElement from './VElement';
import utility from '../service/utility';

import * as NODE from '../service/node';


/**
 * virtual node for generic component
 */
class VComponent extends VElement {
    /**
     * @param {String} tagName  component element tag name
     */
    constructor (tagName) {
        super(tagName);

        this.nodeType = NodeType.COMPONENT;

        /**
         * name of the component
         * @type {String}
         */
        this.name = '';

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
     * define a component dynamic property
     *
     * @param {String} prop  property name
     * @param {Any=} defaultValue  default property value
     * @param {function(VNode):Any=} getter  getter functions
     */
    defProp (prop, defaultValue, getter) {
        utility.ensureValidString(prop, 'prop');

        this[prop] = defaultValue;

        this._propDefs[prop] = {
            defaultValue: defaultValue,
            getter: utility.isFunc(getter) ? getter : null
        };
    }

    setProp (prop, value) {
        if (this._propDefs.hasOwnProperty(prop)) {
            if (utility.isFunc(value)) {
                this._propDefs[prop].getter = value;
            } else {
                this[prop] = value;
            }
        } else {
            super.setProp(prop, value);
        }
    }

    removeProp (prop) {
        if (this._propDefs.hasOwnProperty(prop)) {
            throw new Error('cannot remove defined component prop');
        } else {
            super.removeProp(prop);
        }
    }

    _updateSelfProps () {
        utility.entries(this._propDefs)
            .forEach(([prop, def]) => {
                if (def.getter) {
                    this[prop] = def.getter.call(null, this);
                }
            });
    }

    render () {
        if (NODE.needCompute(this)) {
            this._updateSelfProps();
        }

        super.render();
    }
}

export default VComponent;