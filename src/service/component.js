import { VTemplate, VSlotTemplate } from '../model/VTemplate';

import utility from './utility';
import * as template_builder from './template_builder';


/**
 * component option registration
 */
export const COMPONENT_REGISTRATION = {};

/**
 * component builder registration
 */
export const COMPONENT_BUILDER = {};

/**
 * component context type constants
 */
export const CONTEXT_TYPE = {
    ISOLATE: 'isolate',
    INHERIT: 'inherit'
};

function getDefaultDefinition () {
    return {
        name: '',
        template: null,
        context: null,
        contextType: CONTEXT_TYPE.ISOLATE,
        nodeClass: null,
        props: {},
        options: null,
        children: true,
        isolate: false
    };
}

/**
 * @param {String} name
 * @returns {String}
 */
function convertComponentBuilderName (name) {
    var parts = name.split('-');
    if (parts.length > 0) {
        return parts.map(p => {
            p = p.toLowerCase();
            return p.charAt(0).toUpperCase() + p.substring(1);
        })
        .join('');
    } else {
        return name;
    }
}

/**
 * @param {VTemplate|VTemplate[]} template
 * @returns {VSlotTemplate?}
 */
function findTemplateSlot (template) {
    function doFind (tpls) {
        for (var i = 0; i < tpls.length; i++) {
            var tpl = tpls[i];
            if (tpl instanceof VSlotTemplate) {
                return tpl;
            } else {
                tpl = doFind(tpl.children);
                if (tpl) {
                    return tpl;
                }
            }
        }

        return null;
    }

    if (Array.isArray(template)) {
        return doFind(template);
    } else {
        return doFind([template]);
    }
}

/**
 * define component and get the component builder function
 *
 * @param {Object} options  component definition options
 * @returns {function(...any):VComponentTemplate}
 */
export function defineComponent (options) {
    var cdef = getDefaultDefinition();
    utility.extend(cdef, options);

    cdef.name = cdef.name.trim();

    if (!cdef.name) {
        throw new Error("missing component name");
    }

    // find and save slot template item, so that no scanning is necessary during compile phase
    cdef.$templateSlot = (cdef.children && cdef.template) ? findTemplateSlot(cdef.template) : null;

    // create builder function
    var builder = template_builder.getComponentBuilder(cdef);

    // register template option and builder function
    if (!cdef.isolate) {
        COMPONENT_REGISTRATION[cdef.name] = cdef;
        COMPONENT_BUILDER[convertComponentBuilderName(cdef.name)] = builder;
    }

    return builder;
}

/**
 * get registered component options by name
 *
 * @param {String} name  name of the component
 * @returns {Object}
 */
export function getComponent (name) {
    return COMPONENT_REGISTRATION[name] || null;
}

/**
 * get registered component builder function
 *
 * @param {String} name  name of the component
 * @returns {Function}
 */
export function getComponentBuilder (name) {
    return COMPONENT_BUILDER[convertComponentBuilderName(name)] || null;
}