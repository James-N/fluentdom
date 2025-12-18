import * as TEMPLATE from '../service/template';


var API = {
    Empty: TEMPLATE.buildEmpty,
    If: TEMPLATE.buildIf,
    Repeat: TEMPLATE.buildRepeat,
    Dynamic: TEMPLATE.buildDynamic,
    Fragment: TEMPLATE.buildFragment,
    Slot: TEMPLATE.buildSlot
};

export default API;