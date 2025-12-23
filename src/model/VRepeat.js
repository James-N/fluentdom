import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import * as NODE from '../service/node';
import utility from '../service/utility';
import LOG from '../service/log';
import { loadCompiler } from '../service/compiler';


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
     * @param {Number|Array|function(VNode):Number|Array} dataOrProvider  iteration target
     * @param {function(any):String|String} key  key function
     * @param {VTemplate[]} templates  children templates
     */
    constructor (dataOrProvider, key, templates) {
        super();

        this.nodeType = NodeType.REPEAT;

        if (utility.isFunc(dataOrProvider)) {
            /**
             * dynamic repeat data generator function
             *
             * @type {(function(VNode):Number|Array)?}
             */
            this._provider = dataOrProvider;
            /**
             * @type {Array?}
             *
             * the data to repeat
             */
            this._data = null;
            /**
             * whether repeat data is static, no need to be recomputed each time
             */
            this._static = false;
        } else {
            this._provider = null;
            this._data = this._initData(dataOrProvider);
            this._static = true;
        }

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
         * cache to last key comparsion result
         *
         * @type {Record<String, Number>}
         */
        this._keyMap = {};
    }

    _initData (dataOrProvider) {
        if (utility.isValidNum(dataOrProvider)) {
            return generateNumberSeq(dataOrProvider);
        } else if (Array.isArray(dataOrProvider)) {
            return dataOrProvider.slice(0);
        } else {
            LOG.warn(`invalid data for repeat node: ${dataOrProvider}`);
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

        return node;
    }

    _updateChildrenByKey (compiler, arr) {
        var oldMap = this._keyMap;
        var newMap = {};

        var oldChildren = this.children;
        var newChlidren = [];

        var reflow = false;

        arr.forEach((e, i) => {
            var id = this._key.call(null, e);
            newMap[id] = i;
            if (utility.hasOwn(oldMap, id)) {
                var oldIdx = oldMap[id];
                var oldNode = oldChildren[oldIdx];
                if (oldIdx != i) {
                    oldNode.ctx.$index = i;
                    oldNode.ctx.$value = e;
                    oldChildren[oldIdx] = null;
                    reflow = true;
                }
                newChlidren.push(oldNode);
            } else {
                newChlidren.push(this._compileChild(compiler, e, i));
                reflow = true;
            }
        });

        this.children = newChlidren;
        this._keyMap = newMap;

        NODE.destroyNodes(oldChildren.filter(c => c !== null));

        this.$flags.reflow = reflow;
    }

    _updateChildrenByCompare (compiler, arr) {
        var oldArr = this._data;
        var children = this.children;
        var abandonedNodes = [];
        var reflow = false;

        arr.forEach((e, i) => {
            if (i < oldArr.length) {
                if (e != oldArr[i]) {
                    abandonedNodes.push(children[i]);
                    children[i] = this._compileChild(compiler, e, i);
                    reflow = true;
                }
            } else {
                children.push(this._compileChild(compiler, e, i));
                reflow = true;
            }
        });

        if (oldArr.length > arr.length) {
            for (var i = arr.length; i < oldArr.length; i++) {
                abandonedNodes.push(children[i]);
            }

            children.length = arr.length;
        }

        if (abandonedNodes.length > 0) {
            NODE.destroyNodes(abandonedNodes);
        }

        this.$flags.reflow = reflow;
    }

    compute () {
        // prepare repeat data
        var arr = this._static ?
                  this._data :
                  this._initData(this._provider.call(null, this));


        // update children
        var compiler;
        if (this.children.length === 0) {
            if (arr.length > 0) {
                compiler = loadCompiler(this);

                arr.forEach((e, i) => {
                    this.children.push(this._compileChild(compiler, e, i));
                });

                this.$flags.reflow = true;
            }
        } else if (!this._static) {
            compiler = loadCompiler(this);

            if (this._key) {
                this._updateChildrenByKey(compiler, arr);
            } else {
                this._updateChildrenByCompare(compiler, arr);
            }
        }

        // cache repeat data
        this._data = arr;

        // invoke repeat init hooks
        this.children.forEach(c => this.invokeHook('repeatInit', null, c, c.ctx.$value, c.ctx.$index));
    }
}

export default VRepeat;