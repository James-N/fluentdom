(function (fluent)
{
'use strict';

var FB = fluent.builder;

fluent.addDirective('model', function (vn, callback) {
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

    vn.listen('input', evt => {
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
        FB.Div(
            FB.Input('text', {
                attrs: { placeholder: 'type something...' },
                model: (vn, model) => {
                    model.onChange = function (value) {
                        tree.render();
                    };

                    data.input = model;
                }
            }),
            FB.Button('Add', {
                attrs: { title: 'add new item', disabled: vn => !data.input || !data.input.get() },
                listeners: {
                    click: evt => {
                        data.items.push(data.input.get());
                        data.input.set('');
                        tree.render();
                    }
                }
            }),

            { classes: 'input-line' }
        ),
        FB.Div(
            FB.Repeat(
                vn => data.items,
                FB.Div(
                    FB.Span(FB.TEXT(vn => vn.ctx.$index + 1), { classes: 'item-index' }),
                    FB.Span(FB.TEXT(vn => vn.ctx.$value), { classes: 'item-text' }),
                    FB.Button('×', {
                        classes: 'remove-btn',
                        attrs: {
                            title: 'remove item'
                        },
                        listeners: {
                            click: (evt, vn) => {
                                data.items.splice(vn.ctx.$index, 1);
                                tree.render();
                            }
                        }
                    }),

                    { classes: 'list-item', attrs: { title: vn => vn.ctx.$value } }
                )
            ),

            { classes: 'input-list' }
        )
    ]
});

}(window.fluent));