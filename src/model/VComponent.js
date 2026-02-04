import NodeType from './NodeType';
import VNode from './VNode';
import EventTable from './internal/EventTable';

import utility from '../service/utility';
import { value2Expr } from '../service/expr';
import LOG from '../service/log';


/**
 * @typedef Property
 * @property {any} value  property value
 * @property {Boolean} isExpr  is expression property
 */

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
         * dynamic property definitions
         * @type {Record<String, Property>}
         */
        this.$props = {};

        /**
         * component events
         */
        this._events = new EventTable('VComponent::events');
    }

    /**
     * component post initialization method, implemented by derived class
     *
     * @virtual
     */
    init () {
        // component post-initialization
    }

    compute () {
        // compute expr props
        utility.values(this.$props)
            .forEach(prop => {
                if (prop.isExpr) {
                    prop.value.eval(this);
                }
            });

        // invoke super compute method
        super.compute();
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

//#region  dynamic property registration

/**
 * @readonly
 * @enum {String}
 *
 * property schema enumeration
 */
export const PROPERTY_SCHEMA = {
    VALUE: 'value',
    EXPR: 'expr',
    METHOD: 'method'
};

/**
 * @typedef PropertyConfig
 * @property {PROPERTY_SCHEMA} schema  property schema
 * @property {any=} value  the default property value
 * @property {Function=} fn  method function for `method` schema property
 * @property {Boolean=} readonly  whether property is readonly
 * @property {Boolean=} option  whether property value can be initialized from template options
 * @property {Function=} get  custom getter function for `value` schema property
 * @property {Function=} set  custom setter function for `value` schema property
 */

/**
 * dynamically define property on component
 *
 * @param {VComponent} component  component to define property
 * @param {String} name  property name
 * @param {PropertyConfig} config  property configuration
 */
VComponent.$defineProperty = function (component, name, config) {
    function configValueProperty () {
        var prop = {
            value: utility.hasOwn(config, 'value') ? config.value : null
        };

        var propConfig = {
            get: utility.isFunc(config.get) ? config.get : function () { return prop.value; }
        };

        if (config.readonly) {      // value property is writable by default
            propConfig.set = function () { throw new Error(`component property [${name}] is readonly`); };
        } else {
            propConfig.set = utility.isFunc(config.set) ? config.set : function (value) { prop.value = value; };
        }

        // register property
        component.$props[name] = prop;
        Object.defineProperty(component, name, propConfig);
    }

    function configExprProperty () {
        var prop = {
            value: value2Expr(utility.hasOwn(config, 'value') ? config.value : null),
            isExpr: true
        };

        var propConfig = {
            get: function () { return prop.value.value(); },
            set: !utility.hasOwn(config, 'readonly') || !!config.readonly ?     // expr property is readonly by default
                function () { throw new Error(`component property [${name}] is readonly`); } :
                function (value) { prop.value.set(value); }
        };

        // register property
        component.$props[name] = prop;
        Object.defineProperty(component, name, propConfig);
    }

    function configMethodProperty () {
        if (!config.fn || !utility.isFunc(config.fn)) {
            throw new Error(`invalid method function for method property [${name}]`);
        }

        var method = config.fn.bind(component);

        var propConfig = {
            get: function () { return method; },
            set: function () { throw new Error(`cannot override component method property [${name}]`); }
        };

        // register property
        Object.defineProperty(component, name, propConfig);
    }

    if (!(component instanceof VComponent)) {
        throw new TypeError("invalid component to define property");
    }

    utility.ensureValidString(name, 'name');

    if (name in component) {
        LOG.warn(`property [${name}] already exists on component`);
        return;
    }

    if (!config) {
        throw new Error("invalid property configuration");
    }

    switch (config.schema) {
        case PROPERTY_SCHEMA.VALUE:
            configValueProperty();
            break;
        case PROPERTY_SCHEMA.EXPR:
            configExprProperty();
            break;
        case PROPERTY_SCHEMA.METHOD:
            configMethodProperty();
            break;
        default:
            throw new Error(`invalid property schema [${config.schema}]`);
    }
};

//#endregion

export default VComponent;