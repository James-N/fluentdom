import global from './global';


const document = global.document;

/**
 * convert string to dom nodes
 *
 * @param {String} s  html fragment
 * @param {Boolean=} unsafe  unsafe mode for slightly better performance
 *
 * @returns {Node[]}
 */
export function str2DOM (s, unsafe = false) {
    function convertUnsafe (s) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = s;

        return Array.prototype.slice.call(wrapper.childNodes, 0);
    }

    function sanitizeDOM (doc) {
        var nodes = [doc.body];
        while (nodes.length > 0) {
            var node = nodes.shift();
            var recursive = true;
            switch (node.tagName) {
                case 'SCRIPT':
                case 'IFRAME':
                case 'FORM':
                    node.remove();
                    recursive = false;
                    break;
                default:
                    // inline event purification
                    var attrPattern = /^on\w/i;
                    for (let attr of node.attributes) {
                        if (attrPattern.exec(attr.name) && (attr.name in node)) {
                            node.removeAttribute(attr.name);
                        }
                    }
                    break;
            }

            if (recursive) {
                for (let child of node.children) {
                    nodes.push(child);
                }
            }
        }
    }

    function convertWithSanitize (s) {
        var parser = new global.DOMParser();
        var doc = parser.parseFromString(s, 'text/html');

        sanitizeDOM(doc);

        return Array.prototype.slice.call(doc.body.childNodes, 0);
    }

    return !!unsafe ? convertUnsafe(s) : convertWithSanitize(s);
}

/**
 * remove all child nodes from an element node
 */
const emptyElement = global.Element.prototype.replaceChildren ?
    e => e.replaceChildren() :
    e => e.innerHTML = '';

/**
 * remove all child nodes from a DOM node
 *
 * @param {Node} node
 */
export function emptyNode (node) {
    if (node instanceof global.Element) {
        emptyElement(node);
    } else {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
}

/**
 * create element
 */
export const createEl = document.createElement.bind(document);

/**
 * create text node
 */
export const createText = document.createTextNode.bind(document);

/**
 * create document fragment
 */
export const createFragment = document.createDocumentFragment.bind(document);

/**
 * find element by first match
 */
export const query = document.querySelector.bind(document);

/**
 * find element by all matches
 */
export const queryAll = document.querySelectorAll.bind(document);