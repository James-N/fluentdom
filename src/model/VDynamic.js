import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import * as NODE from '../service/node';
import { getCompiler } from '../service/compiler';


/**
 * virtual node for dynamic node creation
 */
class VDynamic extends VNode {
    /**
     * @param {function(VNode):VTemplate|VTemplate[]} provider  template provider
     */
    constructor (provider) {
        super(NodeType.DYNAMIC);

        /**
         * whther to compile template only once
         * @type {Boolean}
         */
        this.once = true;

        this._updated = false;

        this._tpl = null;
        this._tplProvider = provider;
    }

    render () {
        if (NODE.needCompute(this) && (!this._updated || !this.once)) {
            var tpl = this._tplProvider.call(null, this);

            if (tpl !== this._tpl) {
                // clean old child nodes if necessary
                if (this._tpl !== null) {
                    NODE.destroyNodes(this.children);
                    this.children.length = 0;
                }

                // compile template to nodes
                var compiler = getCompiler(this);
                if (Array.isArray(tpl)) {
                    tpl.forEach(t => {
                        this.addChild(compiler.compile(t));
                    });
                } else {
                    this.addChild(compiler.compile(tpl));
                }
            }

            this._tpl = tpl;
            this._updated = true;
        }

        super.render();

        this.domNode = NODE.collectChildDOMNodes(this);
    }
}

export default VDynamic;