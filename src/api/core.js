import NodeType from '../model/NodeType';
import HookMessage from '../model/HookMessage';
import VNode from '../model/VNode';
import VElement from '../model/VElement';
import VText from '../model/VText';
import VEmpty from '../model/VEmpty';
import VIf from '../model/VIf';
import VRepeat from '../model/VRepeat';
import VDynamic from '../model/VDynamic';
import VFragment from '../model/VFragment';
import VComponent from '../model/VComponent';
import { VTemplate, VElementTemplate, VComponentTemplate } from '../model/VTemplate';
import VTree from '../model/VTree';
import { CompilerExtension } from '../service/compiler';


var API = {
    NodeType: NodeType,
    HookMessage: HookMessage,
    VNode: VNode,
    VElement: VElement,
    VText: VText,
    VEmpty: VEmpty,
    VIf: VIf,
    VRepeat: VRepeat,
    VDynamic: VDynamic,
    VFragment: VFragment,
    VComponent: VComponent,
    VTemplate: VTemplate,
    VElementTemplate: VElementTemplate,
    VComponentTemplate: VComponentTemplate,
    VTree: VTree,
    CompilerExtension: CompilerExtension
};

export default API;