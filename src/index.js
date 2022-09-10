import Core from './api/core';
import Node from './api/node';
import Control from './api/control';
import Component from './api/component';
import * as pub from './api/public';

export default {
    core: Core,
    node: Node,
    control: Control,
    component: Component,

    new: pub.createFluentTree,
    fromDOM: pub.fluentTreeFromDOM,
    templateFromDOM: pub.templateFromDOM,
    newComponent: pub.defineComponent,
    addDirective: pub.registerdirective,

    compile: pub.compileTemplate,
    useCompiler: pub.setCompilerFactory
};