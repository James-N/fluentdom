/**
 * convert string to dom nodes
 *
 * @param {String} s  html fragment
 * @param {Boolean=} unsafe  unsafe mode for slightly better performance
 *
 * @returns {Node[]}
 */
export function str2DOM (s, unsafe) {
    function convertUnsafe (s) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = this.content;

        return Array.prototype.slice.call(wrapper.childNodes, 0);
    }

    function sanitizeDOM (doc) {
        var nodes = [doc.body];
        while (nodes.length > 0) {
            var node = nodes.shift();
            var recursive = true;
            switch (node.tagName) {
                case 'SCRIPT':
                    node.remove();
                    recursive = false;
                    break;
                case 'IMG':
                    node.removeAttribute('onerror');
                    node.removeAttribute('onload');
                    break;
            }

            if (recursive) {
                for (let child of node.children) {
                    nodes.push(child);
                }
            }
        }
    }

    function convertSafe (s) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(s, 'text/html');

        sanitizeDOM(doc);

        return Array.prototype.slice.call(doc.body.childNodes, 0);
    }

    return !!unsafe ? convertUnsafe(s) : convertSafe(s);
}