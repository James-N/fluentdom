import * as TEMPLATE from '../service/template';


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

var API = {
    TEXT: TEMPLATE.buildText,
    ELEMENT: TEMPLATE.buildElement,
    COMPONENT: TEMPLATE.buildDeferredComponent,
    Img: TEMPLATE.buildImage,
    Input: TEMPLATE.buildInput,
    A: TEMPLATE.buildHLink
};

var STANDARD_ELMS = ['div', 'span', 'p', 'section', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'ul', 'ol', 'li', 'form', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'b', 'button', 'textarea', 'canvas'];

var VOID_ELMS = ['br', 'hr'];

var MEDIA_ELMS = ['audio', 'video'];

STANDARD_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeStandardElementBuilder(tag);
});

VOID_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeVoidElementBuilder(tag);
});

MEDIA_ELMS.forEach(tag => {
    API[makeElementKey(tag)] = makeMediaElementBuilder(tag);
});


export default API;