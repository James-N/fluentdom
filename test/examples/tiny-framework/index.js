(function (fluent)
{
'use strict';

var core = fluent.core;
var builder = fluent.builder;

var model = {
    pageIndex: 1,
    showArticle: true,
    highlightArticle: false,
    tags: ['math', 'programming', 'cg', 'EXO']
};

function getModelValue (key, vn) {
    if (vn.ctx && (key in vn.ctx)) {
        return vn.ctx[key];
    } else {
        return model[key];
    }
}

function convertTextNode (node, parentTpl, state) {
    var text = node.textContent.trim();
    if (text !== '') {
        var pattern = /\{\{\s*([a-zA-Z_$]*)\s*}}/g;

        var frags = [];
        var idx = 0;

        var match;
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > idx) {
                frags.push(text.substring(idx, match.index));
            }

            frags.push((key => vn => getModelValue(key, vn))(match[1]));

            idx = match.index + match[0].length;
        }

        if (idx < text.length) {
            frags.push(text.substring(idx));
        }

        var textGetter = vn => frags.map(f => typeof f == 'function' ? f(vn) : f).join('');
        return new core.VTemplate(core.NodeType.TEXT, [textGetter]);
    } else {
        return null;
    }
}

function convertElementNode (node, parentTpl, state) {
    /**
     * @param {String} exp
     */
    function parseVClass (exp) {
        exp = exp.trim();
        if (exp.startsWith('{') && exp.endsWith('}')) {
            exp = exp.substring(1, exp.length - 1);

            var frags = exp.split(',');
            var output = {};

            for (let frag of frags) {
                let [key, val] = frag.split(':');
                key = key.trim();
                val = val.trim();

                let lead = key.charAt(0);
                if (lead == '"' || lead == '\'') {
                    if (lead == key.charAt(key.length - 1)) {
                        key = key.substring(1, key.length - 1);
                    } else {
                        console.log('invalid exp: ', exp);
                        return null;
                    }
                }

                output[key] = val;
            }

            return output;
        } else {
            console.error('invalid exp: ', exp);
            return null;
        }
    }

    /**
     * @param {String} exp
     */
    function parseVRepeat(exp) {
        exp = exp.trim();

        var parts = exp.split(/\s*:\s*/);
        if (parts.length == 2) {
            return parts;
        } else {
            console.error('invalid exp: ', exp);
            return null;
        }
    }

    var tplOpt = { domNode: state.nobinding ? null : node, class: {}, events: {} };
    var newState = state;

    var vtpl = null, vnext = null;
    for (let attr of node.attributes) {
        switch (attr.name) {
            case 'v:if':
                let vIfTpl = new core.VTemplate(core.NodeType.IF, [(key => () => !!model[key])(attr.value)]);
                if (vnext) {
                    vnext.children.push(vIfTpl);
                } else {
                    vtpl = vIfTpl;
                }
                vnext = vIfTpl;
                break;
            case 'v:class':
                let clsInfo = parseVClass(attr.value);
                if (clsInfo) {
                    Object.entries(clsInfo)
                        .forEach(([key, val]) => {
                            tplOpt.class[key] = vn => !!model[val];
                        });
                }

                break;
            case 'v:repeat':
                let repeatInfo = parseVRepeat(attr.value);
                if (repeatInfo) {
                    newState = { nobinding: true };
                    tplOpt.domNode = null;

                    let repeatTpl = new core.VTemplate(
                        core.NodeType.REPEAT,
                        [vn => model[repeatInfo[1]]],
                        {
                            hooks: {
                                repeating: (vn, cvn, value, index) => {
                                    cvn.ctx[repeatInfo[0]] = value;
                                }
                            }
                        }
                    );

                    if (vtpl) {
                        repeatTpl.children.push(vtpl);
                    }

                    vtpl = repeatTpl;

                    if (!vnext) {
                        vnext = vtpl;
                    }
                }
                break;
            case 'v:click':
                let clickHandle = (key => (vn, evt) => model[key].call(null, vn, evt))(attr.value);
                tplOpt.events.click = tplOpt.events.click || [];
                tplOpt.events.click.push(clickHandle);
                break;
        }
    }

    for (let cls of node.classList) {
        tplOpt.class[cls] = true;
    }

    var vElmTpl = new core.VTemplate(core.NodeType.ELEMENT, [node.tagName], tplOpt);
    if (vnext) {
        vnext.children.push(vElmTpl);
    } else {
        vtpl = vElmTpl;
    }
    vnext = vElmTpl;

    return {
        tpl: vtpl,
        next: vnext,
        state: newState
    };
}

var headerTree = fluent.fromDOM('.header', {
    convertText: convertTextNode,
    fixedRoot: true
});

headerTree.render();

var contentTree = fluent.fromDOM('.content', {
    convertText: convertTextNode,
    convertElement: convertElementNode
});

contentTree.render();

fluent.new({
    elm: '.controller',
    template: [
        builder.Button('change title', { events: { click: (vn, evt) => {
            model.pageIndex++;
            headerTree.render();
        } } }),
        builder.Button('toggle article', { events: { click: (vn, evt) => {
            model.showArticle = !model.showArticle;
            contentTree.render();
        } } }),
        builder.Button('toggle highlight', { events: { click: (vn, evt) => {
            model.highlightArticle = !model.highlightArticle;
            contentTree.render();
        } } }),
        builder.Button('add tag', { events: { click: (vn, evt) => {
            model.tags.push(`tag ${model.tags.length + 1}`);
            contentTree.render();
        } } })
    ]
});

}(window.fluent));