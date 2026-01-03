import NodeType from './NodeType';
import VElement from './VElement';
import utility from '../service/utility';


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
         * component type name
         * @type {String}
         */
        this.name = '';

        /**
         * dynamic property definitions
         */
        this._propDefs = {};
    }

    /**
     * component post initialization method, implemented by derived class
     *
     * @virtual
     */
    init () {
        // component initialization
    }

    /**
     * define a component dynamic property
     *
     * @param {String} prop  property name
     * @param {Any=} defaultValue  default property value
     * @param {function(import('./VNode').default):Any=} getter  getter functions
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
        if (utility.hasOwn(this._propDefs, prop)) {
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
        if (utility.hasOwn(this._propDefs, prop)) {
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

    compute () {
        this._updateSelfProps();
        super.compute();
    }
}

export default VComponent;