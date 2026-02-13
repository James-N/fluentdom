import * as TEMPLATE from '../service/template';

/* builder generator functions */

/**
 * @param {String} tagName
 * @return {Function}
 */
function makeStandardElementBuilder (tagName) {
    return function (...args) {
        return TEMPLATE.buildElement(tagName, ...args);
    };
}

/**
 * @param {String} tagName
 * @returns {Function}
 */
function makeVoidElementBuilder (tagName) {
    return function (options) {
        return TEMPLATE.buildVoidElement(tagName, options);
    };
}

/**
 * @param {String} tagName
 * @returns {Function}
 */
function makeVoidSrcElementBuilder (tagName) {
    return function (...args) {
        return TEMPLATE.buildSrcElement(tagName, ...args);
    };
}

/**
 * @param {String} tagName
 * @returns {Function}
 */
function makeMediaElementBuilder (tagName) {
    return function (...args) {
        return TEMPLATE.buildMediaElement(tagName, ...args);
    };
}

/**
 * @param {String} tagName
 * @returns {String}
 */
function makeElementKey (tagName) {
    if (tagName.length > 1) {
        return tagName.charAt(0).toUpperCase() + tagName.substring(1);
    } else {
        return tagName.toUpperCase();
    }
}

/* output builder namespace */

var API = {
    // control nodes
    Empty: TEMPLATE.buildEmpty,
    If: TEMPLATE.buildIf,
    Repeat: TEMPLATE.buildRepeat,
    Dynamic: TEMPLATE.buildDynamic,
    Fragment: TEMPLATE.buildFragment,
    Component: TEMPLATE.buildDeferredComponent,
    Slot: TEMPLATE.buildSlot,

    // dom nodes
    TEXT: TEMPLATE.buildText,
    ELEMENT: TEMPLATE.buildElement,
    Input: TEMPLATE.buildInput,
    A: TEMPLATE.buildHLink,
    Button: TEMPLATE.buildButton
};

var NORMAL_ELMS = ['div', 'span', 'p', 'section', 'footer', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'ul', 'ol', 'li', 'form', 'label', 'select', 'option', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'b', 'del', 'textarea', 'canvas'];
var VOID_ELMS = ['br', 'hr'];
var VOID_SRC_ELMS = ['img', 'source'];
var MEDIA_ELMS = ['audio', 'video'];

NORMAL_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeStandardElementBuilder(tag);
});

VOID_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeVoidElementBuilder(tag);
});

VOID_SRC_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeVoidSrcElementBuilder(tag);
});

MEDIA_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeMediaElementBuilder(tag);
});


export default API;