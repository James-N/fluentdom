import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import LOG from '../service/log';
import utility from '../service/utility';
import * as NODE from '../service/node';
import { loadCompiler } from '../service/compiler';


/**
 * virtual node for if statement
 */
class VIf extends VNode {
    /**
     * @param {function(VNode):Boolean} condition  condition function
     * @param {VTemplate[]?} templates  child node template
     */
    constructor (condition, templates) {
        super();

        this.nodeType = NodeType.IF;

        if (!utility.isFunc(condition)) {
            LOG.warn("condition input of VIf node must be function");
            condition = null;
        }

        /**
         * condition function
         *
         * @type {function(VNode):Boolean}
         */
        this._cond = condition;
        /**
         * the last compute result of condition function
         *
         * @type {Boolean}
         */
        this._condValue = false;

        /**
         * children template
         *
         * @type {VTemplate[]}
         */
        this._tpls = templates || [];

        /**
         * whether generated nodes can be cached for later reuse when the condition becomes false
         *
         * @type {Boolean}
         */
        this.cacheNode = true;

        /**
         * @type {VNode[]?}
         */
        this._childNodeCache = null;
    }

    compute () {
        if (!this._cond) {
            return;
        }

        if (this._tpls.length === 0) {
            return;
        }

        var condValueOld = this._condValue;
        this._condValue = !!this._cond.call(null, this);
        if (condValueOld != this._condValue) {
            if (this._condValue) {
                if (this.cacheNode && this._childNodeCache) {
                    for (let cache of this._childNodeCache) {
                        this.children.push(cache);
                    }
                } else {
                    var compiler = loadCompiler(this);

                    for (let tpl of this._tpls) {
                        this.addChild(compiler.compile(tpl));
                    }
                }
            } else {
                if (this.cacheNode) {
                    if (!this._childNodeCache) {
                        this._childNodeCache = this.children.slice(0);
                    }
                } else {
                    NODE.destroyNodes(this.children);
                }

                // clear child list
                this.children.length = 0;
            }

            // update reflow flag
            this.$flags.reflow = true;
        }
    }

    destroy () {
        if (this._childNodeCache) {
            NODE.destroyNodes(this._childNodeCache);
        }

        super.destroy();
    }
}

export default VIf;