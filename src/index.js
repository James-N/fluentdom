import Core from './api/core';
import Builder from './api/builder';
import Component from './api/component';
import * as pub from './api/public';

export default {
    core: Core,
    builder: Builder,
    component: Component,
    version: __VERSION__,

    new: pub.createFluentTree,
    fromDOM: pub.fluentTreeFromDOM,
    templateFromDOM: pub.templateFromDOM,
    newComponent: pub.defineComponent,
    addDirective: pub.registerDirective,
    expr: pub.createExpr,

    compile: pub.compileTemplate,
    extendCompiler: pub.useCompilerExtension
};