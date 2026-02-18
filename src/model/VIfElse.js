import NodeType from '../enum/NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import { Expr, DynExpr, ConstExpr } from './Expr';

import { value2Expr } from '../service/expr';
import LOG from '../service/log';
import * as NODE from '../service/node';
import { loadCompiler } from '../service/compiler';


/**
 * @typedef {[(function(VNode):Boolean)|Expr<Boolean>?, VTemplate[]?]} BranchDef
 */

/**
 * virtual node for more complex if statement
 */
class VIfElse extends VNode {
    /**
     * @param {BranchDef[]} branches  branch list
     */
    constructor (branches) {
        super();

        this.nodeType = NodeType.IF;

        /**
         * branch selection expression
         *
         * @type {Expr<Number>}
         */
        this._branchExpr = null;

        /**
         * @type {(VTemplate[]?)[]}
         */
        this._tpls = [];

        /**
         * whether generated nodes can be cached for later reuse when branch changed
         *
         * @type {Boolean}
         */
        this.cacheNode = true;

        /**
         * @type {(VNode[]?)[]}
         */
        this._childNodeCache = [];

        // initialize branches
        this._readBranches(branches);
    }

    /**
     * @param {BranchDef[]} branches
     */
    _readBranches (branches) {
        var conds = [];

        var finish = false;
        for (var i = 0; i < branches.length && !finish; i++) {
            var [cond, tpl] = branches[i];
            if (cond) {
                conds.push(value2Expr(cond));
            } else {
                if (conds.length === 0) {
                    throw new Error('VIfElse cannot contains only `else` branch');
                }

                conds.push(new ConstExpr(true));
                finish = true;
            }

            this._tpls.push(tpl);
        }

        if (conds.length === 0) {
            LOG.warn('input branch list for VIfElse is empty, nothing will be computed during rendering');
        }

        this._branchExpr = this._createBranchExpr(conds);
    }

    /**
     * @param {Expr<Boolean>[]} conds
     * @returns {DynExpr<Number>}
     */
    _createBranchExpr (conds) {
        return new DynExpr(() => {
            for (var i = 0; i < conds.length; i++) {
                if (conds[i].eval(this)) {
                    return i;
                }
            }

            return -1;
        }, -1);
    }

    compute () {
        if (this._tpls.length === 0) {
            return;
        }

        if (this._branchExpr.evalChecked(this)) {
            // clear old children
            if (this._branchExpr.prev() >= 0) {
                if (!this.cacheNode) {
                    NODE.destroyNodes(this.children);
                }

                // clear child list
                this.children.length = 0;
            }

            // load new children from new branch
            var branchIdx = this._branchExpr.value();
            if (branchIdx >= 0 && this._tpls[branchIdx]) {
                var cache = this.cacheNode && this._childNodeCache[branchIdx];
                if (cache) {
                    for (let node of cache) {
                        this.children.push(node);
                    }
                } else {
                    var compiler = loadCompiler(this);

                    for (let tpl of this._tpls[branchIdx]) {
                        this.addChild(compiler.compile(tpl));
                    }

                    if (this.cacheNode) {
                        this._childNodeCache[branchIdx] = this.children.slice(0);
                    }
                }
            }

            // update reflow flag
            this.$flags.reflow = true;
        }
    }

    destroy () {
        if (this.cacheNode) {
            for (let cache of this._childNodeCache) {
                if (cache) {
                    NODE.destroyNodes(cache);
                }
            }
        }

        super.destroy();
    }
}

export default VIfElse;