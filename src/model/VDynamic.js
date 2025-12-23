import NodeType from './NodeType';
import VNode from './VNode';
import { VTemplate } from './VTemplate';

import * as NODE from '../service/node';
import { loadCompiler } from '../service/compiler';


/**
 * virtual node for dynamic node creation
 */
class VDynamic extends VNode {
    /**
     * @param {function(VNode):VTemplate|VTemplate[]} provider  template provider
     */
    constructor (provider) {
        super();

        this.nodeType = NodeType.DYNAMIC;

        /**
         * whther to compile template only once
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
         * dynamic template generator function
         *
         * @type {function(VNode):VTemplate|VTemplate[]}
         */
        this._tplProvider = provider;

        /**
         * cache to generated template
         *
         * @type {(VTemplate|VTemplate[])?}
         */
        this._tpl = null;
    }

    compute () {
        if (!this._updated || !this.once) {
            var tpl = this._tplProvider.call(null, this);

            if (tpl !== this._tpl) {
                // clean old child nodes if necessary
                if (this._tpl !== null) {
                    NODE.destroyNodes(this.children);
                    this.children.length = 0;
                }

                // compile template to nodes
                var compiler = loadCompiler(this);
                if (Array.isArray(tpl)) {
                    for (let t of tpl) {
                        this.addChild(compiler.compile(t));
                    }
                } else {
                    this.addChild(compiler.compile(tpl));
                }

                // set reflow flag
                this.$flags.reflow = true;
            }

            this._tpl = tpl;
            this._updated = true;
        }
    }
}

export default VDynamic;