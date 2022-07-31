import * as template_builder from '../service/template_builder';


/**
 * @param {String} tagName
 * @return {Function}
 */
function makeStandardElementBuilder (tagName) {
    return function (...args) {
        return template_builder.buildElement(tagName, ...args);
    };
}

/**
 * @param {String} tagName
 * @returns {Function}
 */
function makeVoidElementBuilder (tagName) {
    return function (options) {
        return template_builder.buildVoidElement(tagName, options);
    };
}

/**
 * @param {String} tagName
 * @returns {Function}
 */
function makeMediaElementBuilder (tagName) {
    return function (...args) {
        return template_builder.buildMediaElement(tagName, ...args);
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
    TEXT: template_builder.buildText,
    ELEMENT: template_builder.buildElement,
    COMPONENT: template_builder.buildDeferredComponent,
    Img: template_builder.buildImage,
    Input: template_builder.buildInput,
    A: template_builder.buildHLink
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