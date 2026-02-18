import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';
import { Expr } from './Expr';
import IterAdaptor from './internal/IterAdaptor';

import * as NODE from '../service/node';
import utility from '../service/utility';
import LOG from '../service/log';
import { loadCompiler } from '../service/compiler';
import { value2Expr } from '../service/expr';


/**
 * @typedef {Number|Array|Iterable|Iterator|Record<String, any>} RepeatSource
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
         * whether force keep the repeated data after each computation
         *
         * @type {Boolean}
         */
        this.keepData = false;

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
             * cache to last repeat data array
             *
             * @type {Array}
             */
            arr: [],
            /**
             * cache to last key comparsion result
             *
             * @type {Record<String, Number>}
             */
            keyMap: {}
        };
    }

    /**
     * @param {RepeatSource} repeatSrc
     * @param {Boolean} keepValue
     *
     * @returns {IterAdaptor}
     */
    _prepareIter (repeatSrc, keepValue) {
        var iter;
        if (utility.isValidNum(repeatSrc)) {
            iter = generateNumberSeq(repeatSrc);
        } else if (utility.isArr(repeatSrc)) {
            iter = repeatSrc.slice(0);
        } else if (utility.isStrictObj(repeatSrc)) {
            iter = utility.entries(repeatSrc);
        } else {
            iter = repeatSrc;
        }

        try {
            return new IterAdaptor(iter, keepValue);
        } catch (err) {
            LOG.warn(`invalid data for repeat node: ${repeatSrc}, ${err.message}`);
            return new IterAdaptor([]);
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

    _updateChildrenByKey (compiler, iter) {
        var oldMap = this._cache.keyMap;
        var newMap = {};

        var oldChildren = this.children;
        var newChlidren = [];

        iter.forEach((e, i) => {
            var key = this._key.call(null, e);
            newMap[key] = i;
            if (utility.hasOwn(oldMap, key)) {
                var oldIdx = oldMap[key];
                var oldNode = oldChildren[oldIdx];
                if (oldIdx != i) {
                    oldNode.ctx.$index = i;
                    oldNode.ctx.$value = e;
                    oldNode.$flags.reflow = true;
                }
                newChlidren.push(oldNode);
                oldChildren[oldIdx] = null;
            } else {
                newChlidren.push(this._compileChild(compiler, e, i));
            }
        });

        this.children = newChlidren;
        this._cache.keyMap = newMap;

        NODE.destroyNodes(oldChildren.filter(c => c !== null));
    }

    _updateChildrenByCompare (compiler, iter) {
        var oldArr = this._cache.arr;
        var children = this.children;

        iter.forEach((e, i) => {
            if (i < oldArr.length) {
                if (e != oldArr[i]) {
                    children[i].ctx.$value = e;
                }
            } else {
                children.push(this._compileChild(compiler, e, i));
            }
        });

        this._cache.arr = iter.values();

        if (oldArr.length > iter.count()) {
            NODE.destroyNodes(children.slice(iter.count()));
            children.length = iter.count();
        }
    }

    compute () {
        if (this._tpls.length === 0) {
            return;
        }

        // prepare repeat data
        var src = this._repeatExpr.eval(this);
        if (!utility.isNum(src) || this._repeatExpr.check()) {
            var hasKey = !!this._key;
            var iter = this._prepareIter(src, !hasKey || this.keepData);

            // update children
            var compiler = loadCompiler(this);
            if (this.children.length === 0) {
                if (hasKey) {
                    var keyMap = {};
                    iter.forEach((e, i) => {
                        keyMap[this._key.call(null, e)] = i;
                        this.children.push(this._compileChild(compiler, e, i));
                    });
                    this._cache.keyMap = keyMap;
                } else {
                    var data = iter.flush();
                    this.children = data.map((e, i) => this._compileChild(compiler, e, i));
                    this._cache.arr = data;
                }
            } else {
                if (hasKey) {
                    this._updateChildrenByKey(compiler, iter);
                } else {
                    this._updateChildrenByCompare(compiler, iter);
                }
            }

            // cache repeat data
            if (this.keepData) {
                this._cache.arr = iter.values();
            }

            // invoke repeat init hooks
            this.children.forEach(c => this.invokeHook('repeating', null, c, c.ctx.$value, c.ctx.$index));
        }
    }
}

export default VRepeat;