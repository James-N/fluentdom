(function (fluent) {
'use strict';

var FN = fluent.node;
var FC = fluent.control;

window.addEventListener('DOMContentLoaded', evt => {
    var data = {
        btnText: 'Click',
        clickable: false,
        showColor1: true,
        showColor2: false,
        arrCount: 3,
        dataArr: ['foo', 'bar', 'haa']
    };

    var tree = fluent.new({
        elm: '#container',
        template:
            FN.Div(
                FN.Button(
                    FN.TEXT(vn => data.btnText),
                    {
                        class: 'click-btn',
                        attrs: { title: 'click please', disabled: vn => !data.clickable },
                        events: {
                            click: (evt, nv) => {
                                window.alert("button clicked");
                            }
                        }
                    }
                ),
                FC.If(
                    vn => data.showColor1 || data.showColor2,
                    FC.If(
                        vn => data.showColor1,
                        FN.Div({
                            styles: {
                                'height': '30px',
                                'background-color': 'yellow'
                            }
                        })
                    ),
                    FC.If(
                        vn => data.showColor2,
                        FN.Div({
                            styles: {
                                'height': '30px',
                                'background-color': 'blue'
                            }
                        })
                    )
                ),
                FC.Repeat(
                    vn => data.dataArr,
                    // vn => data.arrCount,
                    FN.Div(
                        FN.Span(FN.TEXT(vn => `${vn.ctx.$index + 1} - title`)),
                        FN.Div(FN.TEXT(vn => `the content is : ${vn.ctx.$value}`))
                            .class('card-body')
                    )
                    .class('card')
                    .style({
                        'background-color': '#fdc765',
                        'padding': '8px',
                        'margin': '5px 0',
                        'width': '300px',
                        'min-height': '130px'
                    })
                ),
                FC.Fragment(
                    `<div class="fragment">
                        <table>
                            <thead>
                                <tr>
                                    <th>h1</th>
                                    <th>h2</th>
                                    <th>h3</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>A1</td>
                                    <td>A2</td>
                                    <td>A3</td>
                                </tr>
                                <tr>
                                    <td>B1</td>
                                    <td>B2</td>
                                    <td>B3</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>`
                )
            )
            .withOptions({
                class: 'test-container',
                styles: {
                    'padding': '10px'
                }
            })
    });

    tree.render();

    setTimeout(() => {
        data.btnText = 'Click Again';
        data.clickable = true;
        data.showColor1 = !data.showColor1;
        data.showColor2 = !data.showColor2;
        data.arrCount = 5;
        data.dataArr.push('aaa', 'bbb');
        tree.render();
    }, 1000);
});

}(window.fluent));