import NodeType from './NodeType';
import VNode from './VNode';


/**
 * an empty virtual node
 */
class VEmpty extends VNode {
    constructor () {
        super();

        this.nodeType = NodeType.EMPTY;
    }
}

export default VEmpty;