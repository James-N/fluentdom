(function (fluent) {
'use strict';

var FB = fluent.builder;

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
            FB.Div(
                FB.Button(
                    FB.TEXT(vn => data.btnText),
                    (evt, vn) => window.alert("button clicked"),
                    {
                        class: 'click-btn',
                        attrs: { title: 'click please', disabled: vn => !data.clickable }
                    }
                ),
                FB.If(
                    vn => data.showColor1 || data.showColor2,
                    FB.If(
                        vn => data.showColor1,
                        FB.Div({
                            styles: {
                                'height': '30px',
                                'background-color': 'yellow'
                            }
                        })
                    ),
                    FB.If(
                        vn => data.showColor2,
                        FB.Div({
                            styles: {
                                'height': '30px',
                                'background-color': 'blue'
                            }
                        })
                    )
                ),
                FB.Repeat(
                    vn => data.dataArr,
                    // vn => data.arrCount,
                    FB.Div(
                        FB.Span(FB.TEXT(vn => `${vn.ctx.$index + 1} - title`)),
                        FB.Div(FB.TEXT(vn => `the content is : ${vn.ctx.$value}`))
                            .class('card-body')
                    )
                    .class('card')
                    .style({
                        'background-color': '#fdc765',
                        'padding': '8px',
                        'margin': '5px 0',
                        'width': CSS.px(300),
                        'min-height': CSS.px(130)
                    })
                ),
                FB.Fragment(
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