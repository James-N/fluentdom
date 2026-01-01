import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import { Expr } from './Expr';

import * as NODE from '../service/node';
import utility from '../service/utility';
import LOG from '../service/log';
import { loadCompiler } from '../service/compiler';
import { value2Expr } from '../service/expr';


/**
 * @typedef {Number|Array} RepeatSource
 */

/**
 * @param {Number} size  sequence size
 * @returns {Number[]}
 */
function generateNumberSeq (size) {
    var seq = new Array(size);
    for (var i = 0; i < size; i++) {
        seq[i] = i;
    }

    return seq;
}


/**
 * virtual node for repeat statement
 */
class VRepeat extends VNode {
    /**
     * @param {RepeatSource|(function(VNode):RepeatSource)|Expr<RepeatSource>} repeatSrc  data or provider of data to iterate through
     * @param {(function(any):String)|String?} key  key function
     * @param {VTemplate[]} templates  children templates
     */
    constructor (repeatSrc, key, templates) {
        super();

        this.nodeType = NodeType.REPEAT;

        /**
         * repeat data expression
         *
         * @type {Expr<RepeatSource>}
         */
        this._repeatExpr = value2Expr(repeatSrc);

        /**
         * templates for repeat content
         *
         * @type {VTemplate[]}
         */
        this._tpls = templates;

        /**
         * key function for key comparsion
         *
         * @type {(function(any):String)?}
         */
        this._key = this._getKeyFunc(key);

        /**
         * repeat cache used for comparsion
         */
        this._cache = {
            /**
             * cache to last repeat data
             *
             * @type {Array}
             */
            data: [],
            /**
             * cache to last key comparsion result
             *
             * @type {Record<String, Number>}
             */
            keyMap: {}
        };
    }

    /**
     * @param {RepeatSource} repetaSrc
     * @returns {Array}
     */
    _prepareData (repetaSrc) {
        if (utility.isValidNum(repetaSrc)) {
            return generateNumberSeq(repetaSrc);
        } else if (Array.isArray(repetaSrc)) {
            return repetaSrc.slice(0);
        } else {
            LOG.warn(`invalid data for repeat node: ${repetaSrc}`);
            return [];
        }
    }

    _getKeyFunc (key) {
        if (key) {
            return utility.isFunc(key) ? key : (e => e[key]);
        } else {
            return null;
        }
    }

    _compileChild (compiler, data, index) {
        // construct placeholder template
        var tpl = new VTemplate(NodeType.EMPTY, null, { context: { $index: index, $value: data } });
        tpl.children = this._tpls;

        // compile child node
        var node = compiler.compile(tpl);
        // update child reference properties
        node.parent = this;
        NODE.updateNodeDep(node, this);
        // set node reflow flag
        node.$flags.reflow = true;

        return node;
    }

    _updateChildrenByKey (compiler, arr) {
        var oldMap = this._cache.keyMap;
        var newMap = {};

        var oldChildren = this.children;
        var newChlidren = [];

        arr.forEach((e, i) => {
            var id = this._key.call(null, e);
            newMap[id] = i;
            if (utility.hasOwn(oldMap, id)) {
                var oldIdx = oldMap[id];
                var oldNode = oldChildren[oldIdx];
                if (oldIdx != i) {
                    oldNode.ctx.$index = i;
                    oldNode.ctx.$value = e;
                    oldNode.$flags.reflow = true;
                    oldChildren[oldIdx] = null;
                }
                newChlidren.push(oldNode);
            } else {
                newChlidren.push(this._compileChild(compiler, e, i));
            }
        });

        this.children = newChlidren;
        this._cache.keyMap = newMap;

        NODE.destroyNodes(oldChildren.filter(c => c !== null));
    }

    _updateChildrenByCompare (compiler, arr) {
        var oldArr = this._cache.data;
        var children = this.children;

        arr.forEach((e, i) => {
            if (i < oldArr.length) {
                if (e != oldArr[i]) {
                    children[i].ctx.$value = e;
                }
            } else {
                children.push(this._compileChild(compiler, e, i));
            }
        });

        if (oldArr.length > arr.length) {
            NODE.destroyNodes(children.slice(arr.length));

            children.length = arr.length;
        }
    }

    compute () {
        if (this._tpls.length === 0) {
            return;
        }

        // prepare repeat data
        var src = this._repeatExpr.eval(this);
        if (!utility.isNum(src) || this._repeatExpr.check()) {
            var arr = this._prepareData(src);

            // update children
            var compiler;
            if (this.children.length === 0) {
                if (arr.length > 0) {
                    compiler = loadCompiler(this);
                    this.children = arr.map((e, i) => this._compileChild(compiler, e, i));
                }
            } else {
                compiler = loadCompiler(this);

                if (this._key) {
                    this._updateChildrenByKey(compiler, arr);
                } else {
                    this._updateChildrenByCompare(compiler, arr);
                }
            }

            // cache the repeated array
            this._cache.data = arr;

            // invoke repeat init hooks
            this.children.forEach(c => this.invokeHook('repeatInit', null, c, c.ctx.$value, c.ctx.$index));
        }
    }
}

export default VRepeat;