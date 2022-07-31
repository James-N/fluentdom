import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import * as NODE from '../service/node';
import utility from '../service/utility';
import LOG from '../service/log';
import { Compiler } from '../service/compiler';


/**
 * @param {Number} size  sequence size
 * @returns {Number[]}
 */
function generateNumberSeq (size) {
    var seq = [];
    for (var i = 0; i < size; i++) {
        seq.push(i);
    }

    return seq;
}


/**
 * virtual node for repeat statement
 */
class VRepeat extends VNode {
    /**
     * @param {Number|Array|function(VNode):Number|Array} dataOrProvider  iteration target
     * @param {function(VNode):Number|String} key  key function
     * @param {VTemplate[]} templates  children templates
     */
    constructor (dataOrProvider, key, templates) {
        super(NodeType.REPEAT);

        if (utility.isFunction(dataOrProvider)) {
            this._provider = dataOrProvider;
            this._data = null;
            this._static = false;
        } else {
            this._provider = null;
            this._data = this._initData(dataOrProvider);
            this._static = true;
        }
        this._tpls = templates;

        if (key) {
            if (utility.isString(key)) {
                this._key = e => e[key];
            } else {
                this._key = key;
            }
        } else {
            this._key = null;
        }

        this._keyMap = {};
    }

    _initData (data) {
        if (utility.isNumber(data)) {
            if (!isNaN(data)) {
                return generateNumberSeq(data);
            } else {
                LOG.warn("invalid number for repeat node");
                return [];
            }
        } else if (Array.isArray(data)) {
            return data.slice(0);
        } else {
            LOG.warn(`invalid data for repeat node: ${data}`);
            return [];
        }
    }

    _compileChild (compiler, data, index) {
        var tpl = new VTemplate(NodeType.EMPTY, null, { context: { $index: index, $value: data } });
        tpl.children = this._tpls;

        var node = compiler.compile(tpl);
        node.parent = this;
        return node;
    }

    _updateChildrenByKey (compiler, arr) {
        var oldMap = this._keyMap;
        var newMap = {};
        var oldChildren = this.children;
        var newChlidren = [];
        arr.forEach((e, i) => {
            var id = this._key.call(null, e);
            newMap[id] = i;
            if (oldMap.hasOwnProperty(id)) {
                var oldIdx = oldMap[id];
                var oldNode = oldChildren[oldIdx];
                oldNode.ctx.$index = i;
                oldNode.ctx.$value = e;
                newChlidren.push(oldNode);
                oldChildren[oldIdx] = null;
            } else {
                newChlidren.push(this._compileChild(compiler, e, i));
            }
        });

        this.children = newChlidren;
        this._keyMap = newMap;

        NODE.destroyNodes(oldChildren.filter(c => c !== null));
    }

    _updateChildrenByCompare (compiler, arr) {
        var oldArr = this._data;
        var children = this.children;
        var abandonedNodes = [];
        arr.forEach((e, i) => {
            if (i < oldArr.length) {
                if (e != oldArr[i]) {
                    abandonedNodes.push(children[i]);
                    children[i] = this._compileChild(compiler, e, i);
                }
            } else {
                children.push(this._compileChild(compiler, e, i));
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
    }

    render () {
        var arr = this._static ?
                  this._data :
                  this._initData(this._provider.call(null, this));

        var compiler;

        // update children
        if (this.children.length === 0) {
            if (arr.length > 0) {
                compiler = new Compiler();
                compiler.initFrom(this);

                arr.forEach((e, i) => {
                    this.children.push(this._compileChild(compiler, e, i));
                });
            }
        } else if (!this._static) {
            compiler = new Compiler();
            compiler.initFrom(this);

            if (this._key) {
                this._updateChildrenByKey(compiler, arr);
            } else {
                this._updateChildrenByCompare(compiler, arr);
            }
        }

        this._data = arr;

        // invoke repeat init hooks
        this.children.forEach(c => this.invokeHook('repeatInit', null, c, c.ctx.$value, c.ctx.$index));

        // render
        super.render();

        // collect child nodes
        this.domNode = NODE.collectChildDOMNodes(this);
    }
}

export default VRepeat;