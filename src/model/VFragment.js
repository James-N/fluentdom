import NodeType from './NodeType';
import VNode from './VNode';

import utility from '../service/utility';
import * as NODE from '../service/node';
import { str2DOM } from '../service/dom';


/**
 * virtual node for html fragment
 */
class VFragment extends VNode {
    /**
     * @param {String|Node|Node[]|function(VFragment):String|Node|Node[]} contentOrProvider  fragment content or content provider
     */
    constructor (contentOrProvider) {
        super();

        this.nodeType = NodeType.FRAGMENT;

        /**
         * @type {String|Node|Node[]}
         */
        this.content = null;

        this._contentProvider = null;
        this._updated = false;

        // init content if necessray
        this.setContent(contentOrProvider);
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

    render () {
        function convertContent (content) {
            if (utility.isDOMNode(content)) {
                return content;
            } else if (Array.isArray(content)) {
                return content.map(convertContent);
            } else {
                return str2DOM(String(content));
            }
        }

        if (NODE.needCompute(this) && this._tryUpdateContent()) {
            this.domNode = !!this.content ? convertContent(this.content) : null;
            this._updated = true;
        }
    }
}

export default VFragment;