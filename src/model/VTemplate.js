import NodeType from './NodeType';
import utility from '../service/utility';
import { buildText } from '../service/template_builder';


/**
 * update key-value type option for given template
 *
 * @param {VTemplate} tpl
 * @param {String} option
 * @param {String|Object} nameOrSet
 * @param {any} value
 * @param {Boolean=} arrayValue
 */
function updateTplKVOption (tpl, option, nameOrSet, value, arrayValue) {
    if (utility.isStr(nameOrSet)) {
        tpl.options = utility.setOptionValue(tpl.options, [option, nameOrSet], value);
    } else if (utility.isObject(nameOrSet)) {
        tpl.options = utility.setOptionValue(tpl.options, [option], {}, true);

        var optionSet = tpl.options[option];
        utility.entries(nameOrSet)
            .forEach(entry => {
                utility.setOptionValue(optionSet, [entry[0]], entry[1], false, !!arrayValue);
            });
    } else {
        throw new TypeError(`invalid value for [${option}] option.`);
    }
}


/**
 * template holds VNodes initiation data
 */
export class VTemplate {
    constructor (nodeType, initValue, options) {
        this.nodeType = nodeType;

        this.initValue = initValue || null;
        this.options = options || null;

        /**
         * @type {VTemplate[]}
         */
        this.children = [];

        /* template building settings */

        /**
         * whether allow child templates to be added
         * @type {Boolean}
         */
        this.$allowChildren = true;
    }

    /**
     * set `hooks` callback
     * @returns {this}
     */
    hook (nameOrSet, callback) {
        updateTplKVOption(this, 'hooks', nameOrSet, callback, true);
        return this;
    }

    /**
     * set specified option
     *
     * @param {String} key  option key
     * @param {any} value   option value
     *
     * @returns {this}
     */
    option (key, value) {
        this.options = utility.setOptionValue(this.options, [key], value);
        return this;
    }

    /**
     * override node options
     *
     * @param {Object} options
     * @returns {this}
     */
    withOptions (options) {
        this.options = options || null;
        return this;
    }

    /**
     * append child templates
     *
     * @param  {...VTemplate} children
     * @returns {this}
     */
    append (...children) {
        if (!this.$allowChildren) {
            throw new Error("this template does not accept child templates");
        }

        for (let child of children) {
            if (utility.isStr(child)) {
                this.children.push(buildText(child));
            } else if (child instanceof VTemplate) {
                this.children.push(child);
            } else {
                throw new TypeError("invalid child template to append");
            }
        }

        return this;
    }
}

/**
 * abstract class for element-like node templates
 */
class VAbstractElementTemplate extends VTemplate {
    constructor (nodeType, initValue, options) {
        super(nodeType, initValue, options);
    }

    /**
     * set `class` option
     * @returns {this}
     */
    class (cls) {
        this.options = utility.setOptionValue(this.options, ['class'], cls);
        return this;
    }

    /**
     * set `id` option
     * @returns {this}
     */
    id (id) {
        this.options = utility.setOptionValue(this.options, ['id'], id);
        return this;
    }

    /**
     * set `styles` option
     * @returns {this}
     */
    style (nameOrSet, value) {
        updateTplKVOption(this, 'styles', nameOrSet, value);
        return this;
    }

    /**
     * set `attrs` option
     * @returns {this}
     */
    attr (nameOrSet, value) {
        updateTplKVOption(this, 'attrs', nameOrSet, value);
        return this;
    }

    /**
     * set `props` option
     * @returns {this}
     */
    prop (nameOrSet, value) {
        updateTplKVOption(this, 'props', nameOrSet, value);
        return this;
    }

    /**
     * set `events` handle
     * @returns {this}
     */
    event (nameOrSet, handle) {
        updateTplKVOption(this, 'events', nameOrSet, handle, true);
        return this;
    }
}

/**
 * template holds element initiation data
 */
export class VElementTemplate extends VAbstractElementTemplate {
    constructor (tagName, options) {
        super(NodeType.ELEMENT, tagName, options);
    }
}

/**
 * template holds component initiation data
 */
export class VComponentTemplate extends VAbstractElementTemplate {
    constructor (name, initValue, options) {
        super(NodeType.COMPONENT, initValue, options);

        /**
         * @type {String} type name of the component
         */
        this.name = name;

        /**
         * template arguments for deferred component creation
         */
        this.$args = null;

        /**
         * component definition for isolate components
         */
        this.$definition = null;
    }
}

/**
 * special placeholder template that is used to insert custom templates into template tree at compile time
 */
export class VSlotTemplate extends VTemplate {
    constructor (options) {
        super('', null, options);
    }
}