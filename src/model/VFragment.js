import NodeType from '../enum/NodeType';
import VNode from './VNode';
import { Expr } from './Expr';

import utility from '../service/utility';
import { value2Expr } from '../service/expr';
import { str2DOM } from '../service/dom';

/**
 * @typedef {String|Node|Node[]} FragmentContent
 * @typedef {FragmentContent|(function(VFragment):FragmentContent)|Expr<FragmentContent>} FragmentContentProvider
 */

/**
 * virtual node for html fragment
 */
class VFragment extends VNode {
    /**
     * @param {FragmentContentProvider} content  fragment content or provider
     */
    constructor (content) {
        super();

        this.nodeType = NodeType.FRAGMENT;
        this.$flags.endpoint = true;

        /**
         * @type {FragmentContent?}
         */
        this.content = null;

        /**
         * whether sanitize the generated HTML
         *
         * @type {Boolean}
         */
        this.sanitize = true;

        /**
         * fragment content or content generator function
         *
         * @type {Expr<FragmentContent>}
         */
        this._contentExpr = value2Expr(content);
    }

    /**
     * set fragment content
     *
     * @param {FragmentContent|function(VFragment):FragmentContent} content  fragment content or provider
     */
    setContent (content) {
        this._contentExpr = value2Expr(content);
    }

    compute () {
        function convertContent (content, sanitize) {
            if (utility.isDOMNode(content)) {
                return content;
            } else if (utility.isArr(content)) {
                return content.map(convertContent);
            } else {
                return str2DOM(String(content), !sanitize);
            }
        }

        if (this._contentExpr.evalChecked(this)) {
            var content = this._contentExpr.value();
            this.domNode = !!content ? convertContent(content, this.sanitize) : null;
            this.content = content;
            this.$flags.reflow = true;
        }
    }
}

export default VFragment;