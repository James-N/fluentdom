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
     * @param {String|function(VFragment):String} contentOrProvider  fragment content or content provider
     */
    constructor (contentOrProvider) {
        super();

        this.nodeType = NodeType.FRAGMENT;

        /**
         * @type {String}
         */
        this.content = '';

        this._contentProvider = null;
        this._updated = false;

        // init content if necessray
        this.setContent(contentOrProvider);
    }

    /**
     * set fragment content
     *
     * @param {String|function(VFragment):String} content  fragment content or provider
     */
    setContent (content) {
        this._contentProvider = null;

        if (utility.isNullOrUndef(content)) {
            this.content = '';
        } else if (utility.isFunc(content)) {
            this._contentProvider = content;
        } else {
            this.content = String(content);
        }

        this._updated = false;
    }

    _tryUpdateContent () {
        if (this._contentProvider) {
            var content = this._contentProvider.call(null, this);
            if (this.content != content) {
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
        if (NODE.needCompute(this) && this._tryUpdateContent()) {
            this.domNode = str2DOM(this.content);
            this._updated = true;
        }
    }
}

export default VFragment;