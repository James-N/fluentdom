import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import { Expr } from './Expr';

import { value2Expr } from '../service/expr';
import * as NODE from '../service/node';
import { loadCompiler } from '../service/compiler';


/**
 * virtual node for simple if statement
 */
class VIf extends VNode {
    /**
     * @param {(function(VNode):Boolean)|Expr<Boolean>} condition  condition function
     * @param {VTemplate[]?} templates  child node template
     */
    constructor (condition, templates) {
        super();

        this.nodeType = NodeType.IF;

        /**
         * the condition expression
         *
         * @type {Expr<Boolean>}
         */
        this._condExpr = value2Expr(condition);

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
        if (this._tpls.length === 0) {
            return;
        }

        if (this._condExpr.evalChecked(this)) {
            if (this._condExpr.value()) {
                if (this.cacheNode && this._childNodeCache) {
                    for (let node of this._childNodeCache) {
                        this.children.push(node);
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