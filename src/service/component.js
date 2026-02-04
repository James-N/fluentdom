import { VTemplate, VComponentTemplate, VSlotTemplate } from '../model/VTemplate';
import VComponent, { PROPERTY_SCHEMA } from '../model/VComponent';

import utility from './utility';
import * as TEMPLATE from './template';

/**
 * @typedef {ReturnType<getDefaultDefinition>} ComponentDefinition
 */


/**
 * component option registration
 */
export const COMPONENT_REGISTRATION = {};

/**
 * component builder registration
 */
export const COMPONENT_BUILDER = {};

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

function getDefaultDefinition () {
    return {
        /**
         * component name, will be used as registration key and element tag name if necessary
         *
         * @type {String}
         */
        name: '',
        /**
         * component template
         *
         * @type {VTemplate|VTemplate[]?}
         */
        template: null,
        /**
         * custom component template factory function
         *
         * @type {(function(String, any[], Record<String, any>):VComponentTemplate)?}
         */
        templateFactory: null,
        /**
         * extra template builder arguments, will be injected into options
         *
         * @type {String[]}
         */
        args: [],
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
         * custom component node factory
         *
         * @type {(function(String, Record<String, any>):VComponent)|(new function(String, Record<String, any>):VComponent)?}
         */
        nodeFactory: null,
        /**
         * additional custom component post initializer
         *
         * @type {(function(VComponent):void)?}
         */
        init: null,
        /**
         * component extension property table
         *
         * @type {Record<String, import('../model/VComponent').PropertyConfig>?}
         */
        properties: null,
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

    if (!cdef.name) {
        throw new Error("missing component name");
    }

    // normalize properties
    if (cdef.properties) {
        utility.entries(cdef.properties)
            .forEach(([name, prop]) => {
                if (utility.isFunc(prop)) {
                    cdef.properties[name] = {
                        schema: PROPERTY_SCHEMA.METHOD,
                        fn: prop
                    };
                } else if (prop.schema == PROPERTY_SCHEMA.VALUE) {
                    cdef.properties[name] = utility.extend({
                        readonly: false,
                        option: true
                    }, prop);
                } else if (prop.schema == PROPERTY_SCHEMA.EXPR) {
                    cdef.properties[name] = utility.extend({
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