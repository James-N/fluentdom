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
        var parser = new DOMParser();
        var doc = parser.parseFromString(s, 'text/html');

        sanitizeDOM(doc);

        return Array.prototype.slice.call(doc.body.childNodes, 0);
    }

    return !!unsafe ? convertUnsafe(s) : convertWithSanitize(s);
}