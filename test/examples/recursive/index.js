(function (fluent) {
'use strict';

var FN = fluent.node;
var FC = fluent.control;

window.addEventListener('DOMContentLoaded', evt => {
    var treeData = {
        name: 'root',
        children: [{
            name: 'child-1',
            children: [{
                name: 'child-1-1',
                children: []
            }, {
                name: 'child-1-2',
                children: [{
                    name: 'child-1-2-1',
                    children: []
                }]
            }, {
                name: 'child-1-3',
                children: []
            }]
        }, {
            name: 'child-2',
            children: [{
                name: 'child-2-1',
                children: []
            }]
        }]
    };

    var treeNodeTpl =
        FN.Div(
            FN.Div(
                FN.TEXT(vn => vn.ctx._node.name),

                {
                    class: 'tree-name',
                    styles: {
                        cursor: vn => vn.ctx._node.children.length > 0 ? 'pointer' : null
                    },
                    events: {
                        click: (evt, vn) => {
                            evt.stopPropagation();

                            vn.ctx.open = !vn.ctx.open;
                            vn.parent.render();
                        }
                    }
                }
            ),
            FN.Div(
                FC.Repeat(
                    vn => vn.ctx._node.children,
                    FC.Dynamic(vn => treeNodeTpl),

                    {
                        hooks: {
                            repeatInit: (msg, cvn, value, index) => {
                                cvn.ctx._node = value;
                            }
                        }
                    }
                ),
                { class: { 'tree-list': true, show: vn => vn.ctx.open && vn.ctx._node.children.length > 0 } }
            ),

            {
                class: 'tree-node',
                context: { open: true },
                hooks: {
                    nodeInit: msg => {
                        console.log(msg);
                    }
                }
            }
        );

    var tree = fluent.new({
        elm: '#container',
        template:
            FN.Div(treeNodeTpl)
                .withOptions({
                    class: 'tree',
                    context: {
                        _node: treeData
                    }
                })
    });

    tree.render();
});

}(window.fluent));