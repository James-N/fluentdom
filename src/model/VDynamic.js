import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import { Expr } from './Expr';

import * as NODE from '../service/node';
import { value2Expr } from '../service/expr';
import { loadCompiler } from '../service/compiler';


/**
 * virtual node for dynamic node creation
 */
class VDynamic extends VNode {
    /**
     * @param {(function(VNode):VTemplate|VTemplate[])|Expr<VTemplate|VTemplate[]?>} provider  template provider
     */
    constructor (provider) {
        super();

        this.nodeType = NodeType.DYNAMIC;

        /**
         * whether to compile template only once
         *
         * @type {Boolean}
         */
        this.once = true;

        /**
         * whether node computation has been triggered
         *
         * @type {Boolean}
         */
        this._updated = false;

        /**
         * template expression
         *
         * @type {Expr<VTemplate|VTemplate[]?>}
         */
        this._tplExpr = value2Expr(provider);
    }

    compute () {
        if (!this.once || !this._updated) {
            if (this._tplExpr.evalChecked(this)) {
                // clean old child nodes if necessary
                if (this.children.length > 0) {
                    NODE.destroyNodes(this.children);
                    this.children.length = 0;
                }

                // compile template to nodes
                var tpl = this._tplExpr.value();
                if (tpl) {
                    var compiler = loadCompiler(this);
                    if (Array.isArray(tpl)) {
                        for (let t of tpl) {
                            this.addChild(compiler.compile(t));
                        }
                    } else {
                        this.addChild(compiler.compile(tpl));
                    }
                }

                // set reflow flag
                this.$flags.reflow = true;
            }

            this._updated = true;
        }
    }
}

export default VDynamic;