(function (fluent) {
'use strict';

var FB = fluent.builder;

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
        FB.Div(
            FB.Div(FB.TEXT(vn => vn.ctx._node.name))
                .class('tree-name')
                .style('cursor', vn => vn.ctx._node.children.length > 0 ? 'pointer' : null)
                .listen('click', (evt, vn) => {
                    evt.stopPropagation();

                    vn.ctx.open = !vn.ctx.open;
                    vn.parent.render();
                }),
            FB.Div(
                FB.Repeat(
                    vn => vn.ctx._node.children,
                    FB.Dynamic(vn => treeNodeTpl)
                )
                .on('repeating', (evt, cvn, value, index) => {
                    cvn.ctx._node = value;
                })
            )
            .class('tree-list')
            .class('show', vn => vn.ctx.open && vn.ctx._node.children.length > 0)
        )
        .class('tree-node')
        .on('$init', evt => {
            console.log(evt);
        })
        .option('context', { open: true });

    fluent.new({
        elm: '#container',
        template:
            FB.Div(treeNodeTpl)
                .withOptions({
                    classes: 'tree',
                    context: {
                        _node: treeData
                    }
                })
    });
});

}(window.fluent));