import NodeType from './NodeType';
import VNode from './VNode';

import utility from '../service/utility';
import { str2DOM } from '../service/dom';


/**
 * virtual node for html fragment
 */
class VFragment extends VNode {
    /**
     * @param {String|Node|Node[]|function(VFragment):String|Node|Node[]} contentOrProvider  fragment content or content generator function
     */
    constructor (contentOrProvider) {
        super();

        this.nodeType = NodeType.FRAGMENT;
        this.$flags.endpoint = true;

        /**
         * @type {String|Node|Node[]}
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
         * @type {String|Node|Node[]|function(VFragment):String|Node|Node[]}
         */
        this._contentProvider = null;

        /**
         * node udpate flag
         *
         * @type {Boolean}
         */
        this._updated = false;

        // init content if necessray
        if (contentOrProvider) {
            this.setContent(contentOrProvider);
        }
    }

    /**
     * set fragment content
     *
     * @param {String|Node|Node[]|function(VFragment):String|Node|Node[]} content  fragment content or provider
     */
    setContent (content) {
        this._contentProvider = null;

        if (utility.isFunc(content)) {
            this._contentProvider = content;
        } else {
            this.content = content;
        }

        this._updated = false;
    }

    _tryUpdateContent () {
        if (this._contentProvider) {
            var content = this._contentProvider.call(null, this);
            if (this.content !== content) {
                this.content = content;
                return true;
            } else {
                return false;
            }
        } else {
            return !this._updated;
        }
    }

    compute () {
        function convertContent (content, sanitize) {
            if (utility.isDOMNode(content)) {
                return content;
            } else if (Array.isArray(content)) {
                return content.map(convertContent);
            } else {
                return str2DOM(String(content), !sanitize);
            }
        }

        if (this._tryUpdateContent()) {
            this.domNode = !!this.content ? convertContent(this.content, this.sanitize) : null;
            this.$flags.reflow = true;
            this._updated = true;
        }
    }
}

export default VFragment;