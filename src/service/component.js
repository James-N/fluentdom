import { VTemplate, VComponentTemplate, VSlotTemplate } from '../model/VTemplate';
import VComponent from '../model/VComponent';

import utility from './utility';
import * as TEMPLATE from './template';
import { value2Expr } from './expr';
import LOG from './log';


/**
 * component option registration
 */
export const COMPONENT_REGISTRATION = {};

/**
 * component builder registration
 */
export const COMPONENT_BUILDER = {};

//#region  inline component implementation

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
 * @typedef Property
 * @property {any} value  property value
 * @property {Boolean} isExpr  is expression property
 */

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

export class VInlineComponent extends VComponent {
    /**
     * @param {String} name  component name
     */
    constructor (name) {
        super(name);

        /**
         * @type {Record<String, Property>}
         */
        this.$props = {};
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
}

/**
 * dynamically add property on inline component
 *
 * @param {VInlineComponent} component  the inline component instance
 * @param {String} name  property name
 * @param {PropertyConfig} config  property configurations
 * @param {any=} value  init value
 */
export function addProperty (component, name, config, value) {
    function getInitValue (config, value) {
        if (value === undefined) {
            return utility.hasOwn(config, 'value') ? config.value : null;
        } else {
            return value;
        }
    }

    function configValueProperty () {
        var prop = {
            value: getInitValue(config, value)
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
            value: value2Expr(getInitValue(config, value)),
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

    if (!(component instanceof VInlineComponent)) {
        throw new TypeError("invalid component to add property");
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
}

//#endregion

//#region  component definition & management

/**
 * @readonly
 * @enum {String}
 *
 * component context type constants
 */
export const CONTEXT_MODE = {
    ISOLATE: 'isolate',
    INHERIT: 'inherit'
};

/**
 * @typedef {ReturnType<getDefaultDefinition>} ComponentDefinition
 */

function getDefaultDefinition () {
    return {
        /**
         * component name, will be used as registration key and element tag name if necessary
         *
         * @type {String}
         */
        name: '',
        /**
         * component content template
         *
         * @type {VTemplate|VTemplate[]?}
         */
        template: null,
        /**
         * custom component template builder function
         *
         * @type {(function(String, any[], Record<String, any>):VComponentTemplate)?}
         */
        templateBuilder: null,
        /**
         * extra template builder arguments, will be injected into options
         *
         * @type {String[]}
         */
        args: [],
        /**
         * custom component node factory
         *
         * @type {function(String, Record<String, any>|new function(Record<String, any>)|Record<String, PropertyConfig|Function>):VComponent?}
         */
        node: null,
        /**
         * default context object
         *
         * @type {Record<String, any>?}
         */
        context: null,
        /**
         * context mode
         *
         * @type {CONTEXT_MODE}
         */
        contextMode: CONTEXT_MODE.ISOLATE,
        /**
         * default options to be inherited by fall-through target
         *
         * @type {Record<String, any>?}
         */
        options: null,
        /**
         * whether to generate root element by component name automatically
         *
         * @type {Boolean}
         */
        root: true,
        /**
         * whether component accepts children
         *
         * @type {Boolean}
         */
        children: true
    };
}

/**
 * define component and get the component builder function
 *
 * @param {ComponentDefinition} options  component definition options
 * @param {Boolean=} local  do not register the component to global storage
 *
 * @returns {function(...any):VComponentTemplate}
 */
export function defineComponent (options, local = false) {
    var cdef = getDefaultDefinition();
    utility.extend(cdef, options);

    // normalize property name
    cdef.name = cdef.name.trim();
    utility.ensureValidString(cdef.name, "component name");

    // normalize properties
    if (utility.isObj(cdef.node)) {
        utility.entries(cdef.node)
            .forEach(([name, prop]) => {
                if (utility.isFunc(prop) && name != 'init') {
                    cdef.node[name] = {
                        schema: PROPERTY_SCHEMA.METHOD,
                        fn: prop
                    };
                } else if (prop.schema == PROPERTY_SCHEMA.VALUE) {
                    cdef.node[name] = utility.extend({
                        readonly: false,
                        option: true
                    }, prop);
                } else if (prop.schema == PROPERTY_SCHEMA.EXPR) {
                    cdef.node[name] = utility.extend({
                        readonly: true,
                        option: true
                    }, prop);
                }
            });
    }

    // create builder function
    var builder = TEMPLATE.getComponentBuilder(cdef, local);

    // register template option and builder function
    if (!local) {
        COMPONENT_REGISTRATION[cdef.name] = cdef;
        COMPONENT_BUILDER[utility.kebab2PascalCase(cdef.name)] = builder;
    }

    return builder;
}

/**
 * get registered component options by name
 *
 * @param {String} name  name of the component
 * @returns {ComponentDefinition?}
 */
export function getComponent (name) {
    return COMPONENT_REGISTRATION[name] || null;
}

/**
 * get registered component builder function
 *
 * @param {String} name  name of the component
 * @returns {(function(...any):VComponentTemplate)?}
 */
export function getComponentBuilder (name) {
    return COMPONENT_BUILDER[utility.kebab2PascalCase(name)] || null;
}

//#endregion

//#region  component utility functions

/**
 * find all slots from given template(s)
 *
 * @param {VTemplate|VTemplate[]} template
 * @returns {Record<String, VSlotTemplate>?} mapping of slot name to slot template and null if no slot found
 */
export function findTemplateSlots (template) {
    function collect (tpls, result) {
        var found = false;

        for (var i = 0; i < tpls.length; i++) {
            var tpl = tpls[i];
            if (tpl instanceof VSlotTemplate) {
                result[tpl.name] = tpl;
                found = true;
            }

            if (tpl.children.length > 0) {
                found = found || collect(tpl.children, result);
            }
        }

        return found;
    }

    var result = {};
    return collect(utility.ensureArr(template), result) ? result : null;
}

//#endregion