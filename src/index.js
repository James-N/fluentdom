import './api/prelude';

export const version = '__VERSION__';

export { default as core } from './api/core';
export { default as Builder } from './api/builder';
export { default as component } from './api/component';

export {
    createFluentTree as new,
    fluentTreeFromDOM as fromDOM,
    templateFromDOM,
    defineComponent as newComponent,
    registerDirective as addDirective,
    createExpr as expr,
    createCallbackBuilder as callback,
    extendClass,
    compileTemplate as compile,
    useCompilerExtension as extendCompiler
} from './api/public';