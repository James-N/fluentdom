(function (fluent)
{
'use strict';

var FN = fluent.node;
var FC = fluent.control;

fluent.addDirective('model', function (vn, callback, options) {
    var modelObj = {
        _value: '',
        set (val) {
            if (this._value !== val) {
                this._value = val;
                vn.domNode.value = String(val);
            }
        },
        get () {
            return this._value;
        },
        onChange: null
    };

    vn.on('input', evt => {
        var inputVal = vn.domNode.value;
        if (modelObj._value !== inputVal) {
            modelObj._value = inputVal;

            if (typeof modelObj.onChange == 'function') {
                modelObj.onChange.call(null, inputVal);
            }
        }
    });

    callback(vn, modelObj);
});

var data = {
    input: null,
    items: []
};

var tree = fluent.new({
    elm: '#container',
    template: [
        FN.Div(
            FN.Input('text', {
                attrs: { placeholder: 'type something...' },
                model: (vn, model) => {
                    model.onChange = function (value) {
                        tree.render();
                    };

                    data.input = model;
                }
            }),
            FN.Button('Add', {
                attrs: { title: 'add new item', disabled: vn => !data.input || !data.input.get() },
                events: {
                    click: evt => {
                        data.items.push(data.input.get());
                        data.input.set('');
                        tree.render();
                    }
                }
            }),

            { class: 'input-line' }
        ),
        FN.Div(
            FC.Repeat(
                vn => data.items,
                FN.Div(
                    FN.Span(FN.TEXT(vn => vn.ctx.$index + 1), { class: 'item-index' }),
                    FN.Span(FN.TEXT(vn => vn.ctx.$value), { class: 'item-text' }),
                    FN.Button('×', {
                        class: 'remove-btn',
                        attrs: {
                            title: 'remove item'
                        },
                        events: {
                            click: (evt, vn) => {
                                data.items.splice(vn.ctx.$index, 1);
                                tree.render();
                            }
                        }
                    }),

                    { class: 'list-item', attrs: { title: vn => vn.ctx.$value } }
                )
            ),

            { class: 'input-list' }
        )
    ]
});

tree.render();

}(window.fluent));