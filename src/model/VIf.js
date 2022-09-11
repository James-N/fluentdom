import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import LOG from '../service/log';
import utility from '../service/utility';
import * as NODE from '../service/node';
import { getCompiler } from '../service/compiler';


/**
 * virtual node for if statement
 */
class VIf extends VNode {
    /**
     * @param {function(VNode):Boolean} condition  condition function
     * @param {VTemplate[]?} templates  child node template
     */
    constructor (condition, templates) {
        super(NodeType.IF);

        if (!utility.isFunc(condition)) {
            LOG.warn("condition input of VIf node must be function");
            condition = null;
        }

        this._cond = condition;
        this._condValue = false;
        this._tpls = templates || [];

        /**
         * whether generated nodes can be cached when the condition is false
         * @type {Boolean}
         */
        this.cacheNode = true;
    }

    render () {
        if (!this._cond) {
            return;
        }

        if (NODE.needCompute(this)) {
            this._condValue = this._cond.call(null, this);
            if (this._condValue) {
                if (this.children.length === 0 && this._tpls.length > 0) {
                    var compiler = getCompiler(this);

                    this._tpls.forEach(t => {
                        this.addChild(compiler.compile(t));
                    });
                }

                super.render();
                this.domNode = NODE.collectChildDOMNodes(this);
            } else {
                if (this.children.length > 0 && !this.cacheNode) {
                    NODE.destroyNodes(this.children);
                    this.children.length = 0;
                }

                this.domNode = null;
            }
        } else {
            if (this._condValue) {
                super.render();
                this.domNode = NODE.collectChildDOMNodes(this);
            }
        }
    }
}

export default VIf;