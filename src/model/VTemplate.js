import NodeType from '../enum/NodeType';
import MethodExtension from './internal/MethodExtension';

import utility from '../service/utility';
import { buildText } from '../service/template';


/**
 * template holds VNodes initialization data
 */
export class VTemplate extends MethodExtension {
    /**
     * @param {String} type  template type
     * @param {any[]?} args  init arguments
     * @param {Record<String, any>?} options  template options
     */
    constructor (type, args, options) {
        super();

        /**
         * template type, this property is (mainly) used by compiler to choose different compile modules
         *
         * @type {String}
         */
        this.type = type;

        /**
         * template arguments
         *
         * @type {any[]}
         */
        this.args = args || [];

        /**
         * template creation options
         *
         * @type {Record<String, any>?}
         */
        this.options = options || null;

        /**
         * child templates
         *
         * @type {VTemplate[]}
         */
        this.children = [];

        /* template building settings */

        /**
         * whether allow child templates to be added
         *
         * @type {Boolean}
         */
        this.$allowChildren = true;
    }

    /**
     * get argument at index
     *
     * @param {Number} i  arg index
     * @param {any=} defaultValue  default value
     *
     * @returns {any}
     */
    arg (i, defaultValue = null) {
        return i < this.args.length ? this.args[i] : defaultValue;
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
     * override template options
     *
     * @param {Record<String, Object>?} options
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
        this.args = src.args.slice(0);
        this.children = src.children.map(c => c.clone());
        this.$allowChildren = src.$allowChildren;

        // clone options
        if (src.options) {
            var clonedOptions = utility.extend({}, src.options);

            if (src.options.events) {
                clonedOptions.events = utility.simpleDeepClone(src.options.events);
            }

            this.options = clonedOptions;
        }
    }

    /**
     * create clone of this template
     */
    clone () {
        var cloned = new VTemplate(this.type);
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * template holds `IF` type node initialization data
 */
export class VIfTemplate extends VTemplate {
    /**
     * @param {Record<String, any>=} options
     */
    constructor (options) {
        super(NodeType.IF, [], options);
    }

    _makeBranchTpl (cond, branchTpl) {
        var tpl = new VTemplate('@branch', [cond]);
        if (branchTpl) {
            tpl.children = branchTpl;
        }

        return tpl;
    }

    /**
     * append the `if` branch
     *
     * @param {any} cond  main branch condition
     * @param {...VTemplate} tpl  branch template
     *
     * @returns {this}
     */
    if (cond, ...tpl) {
        if (this.children.length > 0) {
            throw new Error("cannot add multiple `if` branches");
        }

        this.children.push(this._makeBranchTpl(cond, tpl));
    }

    /**
     * append an `else if` branch
     *
     * @param {any} cond  branch condition
     * @param {...VTemplate} tpl  branch template
     *
     * @returns {this}
     */
    elif (cond, ...tpl) {
        if (this.children.length === 0) {
            throw new Error("cannot add `else if` branch when `if` branch is missing");
        }

        this.children.push(this._makeBranchTpl(cond, tpl));
        return this;
    }

    /**
     * append an `else` branch
     *
     * @param {...VTemplate} tpl  branch template
     * @returns {this}
     */
    else (...tpl) {
        if (this.children.length === 0) {
            throw new Error("cannot add `else` branch when `if` branch is missing");
        }

        this.children.push(this._makeBranchTpl(null, tpl));
        return this;
    }

    append (...children) {
        throw new Error("cannot manually append child to VIfTemplate");
    }

    clone () {
        var cloned = new VIfTemplate();
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
     * @param {VAbstractElementTemplate} src
     */
    _cloneFrom (src) {
        super._cloneFrom(src);

        if (src.options) {
            if (src.options.id) {
                this.options.id = src.options.id;
            }

            ['styles', 'attrs', 'props', 'classes', 'listeners'].forEach(opt => {
                if (src.options[opt]) {
                    this.options[opt] = utility.simpleDeepClone(src.options[opt]);
                }
            });
        }
    }
}

/**
 * template holds element initialization data
 */
export class VElementTemplate extends VAbstractElementTemplate {
    /**
     * @param {String} tagName  element tag name
     * @param {Record<String, any>?} options  template options
     */
    constructor (tagName, options) {
        super(NodeType.ELEMENT, null, options);

        /**
         * element tag name
         *
         * @type {String}
         */
        this.tagName = tagName;
    }

    /**
     * @param {VElementTemplate} src
     */
    _cloneFrom (src) {
        super._cloneFrom(src);
        this.tagName = src.tagName;
    }

    clone () {
        var cloned = new VElementTemplate();
        cloned._cloneFrom(this);

        return cloned;
    }
}

/**
 * template holds component initialization data
 */
export class VComponentTemplate extends VAbstractElementTemplate {
    /**
     * @param {String} name  component name
     * @param {any[]?} args  init arguments
     * @param {Record<String, any>?} options   template options
     */
    constructor (name, args, options) {
        super(NodeType.COMPONENT, args, options);

        /**
         * type name of the component
         *
         * @type {String}
         */
        this.name = name;

        /**
         * deferred component creation flag
         *
         * @type {Boolean}
         */
        this.$deferred = false;

        /**
         * component definition for isolate components
         *
         * @type {import('../service/component').ComponentDefinition?}
         */
        this.$definition = null;
    }

    /**
     * @param {VComponentTemplate} src
     */
    _cloneFrom (src) {
        super._cloneFrom(src);

        this.name = src.name;
        this.$deferred = src.$deferred;
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