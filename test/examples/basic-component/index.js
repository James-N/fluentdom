(function (fluent)
{
'use strict';

var FN = fluent.node;
var FC = fluent.control;

fluent.addDirective('dynDisable', function (node, callback) {
    if (node instanceof fluent.core.VElement && node.tagName == 'BUTTON') {
        node.setAttr('disabled', vn => callback(vn));
    }
});

class CardComponent extends fluent.core.VComponent {
    constructor (title, content) {
        super();

        this.title = title;
        this.content = content;

        this.state = '';
    }

    execAction (data) {
        window.alert(data);
    }
}

var CardBuilder = fluent.newComponent({
    name: 'my-card',
    template:
        FN.Div(
            FN.Div(
                FN.TEXT(vn => vn.dep.title),
            ),
            FN.Div(
                FN.Div(
                    FN.TEXT(vn => vn.dep.content),
                    { class: 'card-content' }
                ),
                { class: 'card-body' }
            ),
            FN.Div(
                FC.Slot('no actions'),

                { class: 'card-actions' }
            ),

            { class: 'card-wrapper' }
        ),
    context: {},
    nodeClass: CardComponent,
    props: {
        state: 'normal'
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

var tree = fluent.new({
    elm: '#container',
    template:
        // FC.Repeat(
        //     cards,
        //     CardBuilder('', ''),

        //     {
        //         hooks: {
        //             repeatInit: (vn, cvn, value, index) => {
        //                 var card = cvn.children[0];
        //                 card.title = value.title;
        //                 card.content = value.content;
        //             }
        //         }
        //     }
        // )
        FC.Repeat(
            cards,
            FC.Dynamic(({ctx}) => CardBuilder(
                ctx.$value.title,
                ctx.$value.content,
                FN.Button(`action ${ctx.$index+1}`, {
                    events: { click: (evt, vn) => vn.dep.execAction(ctx.$value.data) },
                    dynDisable: vn => !ctx.$value.hasAction
                }),

                {
                    nodeProps: {
                        state: vn => ctx.$value.hasAction ? 'normal' : 'mute'
                    }
                }
            ))
        )
});

tree.render();

}(window.fluent));