import NodeType from '../enum/NodeType';
import LifecycleEvents from '../enum/LifecycleEvents';
import VNode from './VNode';
import { Expr } from './Expr';

import { value2Expr } from '../service/expr';
import * as DOM from '../service/dom';


/**
 * virtual node for html text
 */
class VText extends VNode {
    /**
     * @param {String|(function(VText):String)|Expr<String>=} text  text content or provider
     */
    constructor (text) {
        super();

        this.nodeType = NodeType.TEXT;
        this.$flags.endpoint = true;

        /**
         * text content
         * @type {String}
         */
        this.text = '';

        /**
         * text expression
         * @type {Expr<String>}
         */
        this._textExpr = value2Expr(text === undefined ? '' : text);
    }

    /**
     * @returns {Text}
     */
    _prepareTextNode () {
        if (!this.domNode) {
            // create text node
            this.domNode = DOM.createText('');
            // update reflow flag
            this.$flags.reflow = true;
            // trigger `DOM_CREATED` event
            this.emit(LifecycleEvents.DOM_CREATED);

            return this.domNode;
        } else {
            return this.domNode;
        }
    }

    /**
     * set text content
     *
     * @param {String|(function(VText):String)|Expr<String>} text  text content or provider
     */
    setText (text) {
        this._textExpr = value2Expr(text);
    }

    compute () {
        // eval text expression
        if (this._textExpr.evalChecked(this)) {
            this.text = String(this._textExpr.value());

            // update text node content
            var node = this._prepareTextNode();
            node.textContent = this.text;
        }
    }
}

export default VText;