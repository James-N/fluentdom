import NodeType from './NodeType';

/**
 * template holds VNodes' initiation data
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
     */
    withOptions (options) {
        this.options = options || null;
        return this;
    }
}

/**
 * template holds component initiation data
 */
export class VComponentTemplate extends VTemplate {
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