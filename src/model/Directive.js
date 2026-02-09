import VNode from './VNode';
import { VTemplate } from './VTemplate';

/**
 * @abstract
 *
 * directive base class
 */
class Directive {
    constructor () {
        /**
         * directive priority, smaller value means higher priority
         *
         * @type {Number}
         */
        this.priority = 0;
    }

    /**
     * method invoked before template compilation
     *
     * @virtual
     *
     * @param {VTemplate} tpl  template to be compiled
     * @param {any} optionValue  directive option value
     *
     * @returns {VTemplate}
     */
    precompile (tpl, optionValue) { return tpl; }

    /**
     * method invoked after template is compiled into node
     *
     * @virtual
     *
     * @param {VNode} node  the node this directive attached to
     * @param {any} optionValue  directive option value
     */
    postcompile (node, optionValue) { return; }

    /**
     * destroy directive, normally triggered by node destruction
     *
     * @virtual
     */
    destroy () { return; }
}

export default Directive;