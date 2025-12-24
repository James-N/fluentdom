import NodeType from './NodeType';

import utility from '../service/utility';
import { buildText } from '../service/template';


/**
 * update key-value type option for given template
 *
 * @param {VTemplate} tpl
 * @param {String} option
 * @param {String|Record<String, any>} nameOrSet
 * @param {any} value
 * @param {Boolean=} arrayValue
 */
function updateTplKVOption (tpl, option, nameOrSet, value, arrayValue) {
    if (utility.isStr(nameOrSet)) {
        tpl.options = utility.setOptionValue(tpl.options, [option, nameOrSet], value);
    } else if (utility.isObj(nameOrSet)) {
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
    /**
     * @param {NodeType} nodeType  node type
     * @param {any} initValue  init argument value
     * @param {Record<String, any>} options  template options
     */
    constructor (nodeType, initValue, options) {
        /**
         * @type {String}
         */
        this.nodeType = nodeType;

        /**
         * @type {any}
         */
        this.initValue = initValue || null;

        /**
         * @type {Record<String, any>}
         */
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
     * @param {Record<String, Object>} options
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

    /**
     * clone properties from another template
     *
     * @param {VTemplate} src
     */
    _cloneFrom (src) {
        this.initValue = src.initValue;
        this.children = src.children.map(c => c.clone());
        this.$allowChildren = src.$allowChildren;

        // clone options
        if (src.options) {
            var clonedOptions = utility.extend({}, src.options);

            if (src.options.hooks) {
                clonedOptions.hooks = utility.simpleDeepClone(src.options.hooks);
            }

            this.options = clonedOptions;
        }
    }

    /**
     * create clone of this template
     */
    clone () {
        var cloned = new VTemplate(this.nodeType);
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * @abstract
 *
 * abstract class for element-like node templates
 */
class VAbstractElementTemplate extends VTemplate {
    /**
     * @param {NodeType} nodeType  node type
     * @param {any} initValue  arbitrary init value
     * @param {Record<String, any>?} options  template options
     */
    constructor (nodeType, initValue, options) {
        super(nodeType, initValue, options);
    }

    /**
     * set `class` option
     * @returns {this}
     */
    class (clsOrSet, value) {
        if (utility.isStrictObj(clsOrSet)) {
            clsOrSet = utility.extend({}, clsOrSet);
        } else if (utility.isStr(clsOrSet) && utility.isFunc(value)) {
            clsOrSet = { [clsOrSet]: value };
        }

        this.options = utility.setOptionValue(this.options, ['class'], clsOrSet, false, true);
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

    /**
     * @param {VAbstractElementTemplate} src
     */
    _cloneFrom (src) {
        super._cloneFrom(src);

        if (src.options) {
            if (src.options.id) {
                this.options.id = src.options.id;
            }

            ['styles', 'attrs', 'props', 'class', 'events'].forEach(opt => {
                if (src.options[opt]) {
                    this.options[opt] = utility.simpleDeepClone(src.options[opt]);
                }
            });
        }
    }
}

/**
 * template holds element initiation data
 */
export class VElementTemplate extends VAbstractElementTemplate {
    /**
     * @param {String} tagName  element tag name
     * @param {Record<String, any>} options  template options
     */
    constructor (tagName, options) {
        super(NodeType.ELEMENT, tagName, options);
    }

    clone () {
        var cloned = new VElementTemplate();
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * template holds component initiation data
 */
export class VComponentTemplate extends VAbstractElementTemplate {
    /**
     * @param {String} name  component name
     * @param {any} initValue  arbitrary init value
     * @param {Record<String, any>?} options   template options
     */
    constructor (name, initValue, options) {
        super(NodeType.COMPONENT, initValue, options);

        /**
         * type name of the component
         *
         * @type {String}
         */
        this.name = name;

        /**
         * template arguments for deferred component creation
         *
         * @type {Array?}
         */
        this.$args = null;

        /**
         * component definition for isolate components
         */
        this.$definition = null;
    }

    /**
     * @param {VElementTemplate} src
     */
    _cloneFrom (src) {
        super._cloneFrom(src);

        this.name = src.name;
        this.$args = src.$args;
        this.$definition = src.$definition;
    }

    clone () {
        var cloned = new VComponentTemplate();
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * special placeholder template that is used to insert custom templates into template tree at compile time
 */
export class VSlotTemplate extends VTemplate {
    /**
     * @param {String=} name  slot name
     */
    constructor (name) {
        super('', null, null);

        /**
         * slot name
         * @type {String}
         */
        this.name = name || VSlotTemplate.DEFAULT_SLOT_NAME;
    }

    clone () {
        var cloned = new VSlotTemplate(this.name);
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * the default slot name
 */
VSlotTemplate.DEFAULT_SLOT_NAME = 'default';