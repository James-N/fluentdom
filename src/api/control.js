import * as template_builder from '../service/template_builder';


var API = {
    Empty: template_builder.buildEmpty,
    If: template_builder.buildIf,
    Repeat: template_builder.buildRepeat,
    Dynamic: template_builder.buildDynamic,
    Fragment: template_builder.buildFragment,
    Slot: template_builder.buildSlot
};

export default API;