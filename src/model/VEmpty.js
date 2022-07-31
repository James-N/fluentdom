import NodeType from './NodeType';
import VNode from './VNode';

import * as NODE from '../service/node';


/**
 * an empty virtual node
 */
class VEmpty extends VNode {
    constructor () {
        super(NodeType.EMPTY);
    }

    render () {
        super.render();
        this.domNode = NODE.collectChildDOMNodes(this);
    }
}

export default VEmpty;