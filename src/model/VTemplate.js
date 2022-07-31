import NodeType from './NodeType';
import utility from '../service/utility';


/**
 * update key-value type option for given template
 *
 * @param {VTemplate} tpl
 * @param {String} option
 * @param {String|Object} nameOrSet
 * @param {any} value
 */
function updateTplKVOption (tpl, option, nameOrSet, value) {
    if (utility.isStr(nameOrSet)) {
        tpl.options = utility.setOptionValue(tpl.options, [option, nameOrSet], value);
    } else if (utility.isObject(nameOrSet)) {
        tpl.options = utility.setOptionValue(tpl.options, [option], {}, true);

        var optionSet = tpl.options[option];
        utility.entries(nameOrSet)
            .forEach(entry => {
                optionSet[entry[0]] = entry[1];
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
        updateTplKVOption(this, 'events', nameOrSet, handle);
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

    /**
     * set `nodeProps` option
     * @returns {this}
     */
    nodeProp (nameOrSet, value) {
        updateTplKVOption(this, 'nodeProps', nameOrSet, value);
        return this;
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