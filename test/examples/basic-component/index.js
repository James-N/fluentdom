(function (fluent)
{
'use strict';

var FB = fluent.builder;

fluent.addDirective('autoDisable', function (node, callback) {
    if (node instanceof fluent.core.VElement && node.tagName == 'BUTTON') {
        node.setAttr('disabled', vn => callback(vn));
    }
});

var CardBuilder = fluent.newComponent({
    name: 'my-card',
    template:
        FB.Div(
            FB.Div(FB.TEXT(vn => vn.dep.title)),
            FB.Div(
                FB.Div(FB.TEXT(vn => vn.dep.content))
                    .class('card-content')
            )
            .class('card-body'),
            FB.Div(FB.Slot('', 'no actions'))
                .class('card-actions')
        )
        .class('card-wrapper'),
    args: ['title', 'content'],
    context: {},
    node: {
        title: { schema: 'value' },
        content: { schema: 'value' },
        state: {
            schema: 'expr',
            value: 'normal'
        },
        execAction: function (data) {
            window.alert(data);
        },
        init: function (component) {
            console.log('init: ', component);
        }
    },
    options: {
        class: vn => 'state-' + vn.dep.state
    }
});

var cards = [{
    title: 'card-1',
    content: 'this is card 1',
    data: 'card 1',
    hasAction: true
}, {
    title: 'card-2',
    content: 'this is card 2',
    data: 'card 2',
    hasAction: false
}, {
    title: 'card-3',
    content: 'this is card 3',
    data: 'card 3',
    hasAction: true
}];

fluent.new({
    elm: '#container',
    template:
        // FB.Repeat(
        //     cards,
        //     CardBuilder('', ''),

        //     {
        //         hooks: {
        //             repeating: (vn, cvn, value, index) => {
        //                 var card = cvn.children[0];
        //                 card.title = value.title;
        //                 card.content = value.content;
        //             }
        //         }
        //     }
        // )
        FB.Repeat(
            cards,
            FB.Dynamic(({ctx}) =>
                CardBuilder(
                    ctx.$value.title,
                    ctx.$value.content,
                    FB.Button(`action ${ctx.$index+1}`, {
                        events: { click: (evt, vn) => vn.dep.execAction(ctx.$value.data) },
                        autoDisable: vn => !ctx.$value.hasAction
                    })
                )
                .option('state', vn => ctx.$value.hasAction ? 'normal' : 'mute'))
        )
});

}(window.fluent));