import NodeType from './NodeType';
import VNode from './VNode';

import utility from '../service/utility';


/**
 * virtual node for html text
 */
class VText extends VNode {
    /**
     * @param {String|function(VText):String} textOrProvider  text content or text provider
     */
    constructor (textOrProvider) {
        super(NodeType.TEXT);

        /**
         * text content
         * @type {String}
         */
        this.text = '';

        this._textProvider = null;

        this.setText(textOrProvider);
    }

    /**
     * @returns {Text}
     */
    _initNode () {
        if (this.domNode === null) {
            this.domNode = document.createTextNode('');

            this.invokeHook('domNodeCreated');

            return this.domNode;
        } else {
            return this.domNode;
        }
    }

    /**
     * set text content
     *
     * @param {String|function(VText):String} text  text content or provider
     */
    setText (text) {
        if (utility.isNullOrUndef(text)) {
            this.text = '';
        } else if (utility.isFunc(text)) {
            this._textProvider = text;
        } else {
            this.text = String(text);
        }
    }

    render () {
        if (this._textProvider) {
            this.text = String(this._textProvider.call(null, this));
        }

        var node = this._initNode();
        if (node.textContent != this.text) {
            node.textContent = this.text;
        }
    }
}

export default VText;