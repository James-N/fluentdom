import VNode from './VNode';
import NodeType from './NodeType';

import * as NODE from '../service/node';
import utility from '../service/utility';
import LOG from '../service/log';


/**
 * @param {String} name
 * @return {String}
 */
function normalizeCssPropName (name) {
    if (name.charAt(0) == '-') {
        name = name.substring(1);
    }

    return name.split('-')
               .map((s, i) => i > 0 ? s.charAt(0).toUpperCase() + s.substring(1) : s)
               .join('');
}

function createEventSet (evtName, vnode) {
    var evtSet = {
        name: evtName,
        callback: null,
        handles: []
    };

    evtSet.callback = evt => {
        for (var i = 0; i < evtSet.handles.length; i++) {
            try {
                evtSet.handles[i].call(null, evt, vnode);
            } catch (err) {
                LOG.error(`error inside callback of event [${evtName}]`, err);
            }
        }
    };

    return evtSet;
}

class ClassDecl {
    constructor (cls, getter) {
        this.cls = cls;
        this._getter = getter;
    }

    isEnable (vn) {
        return !!this._getter.call(null, vn);
    }
}

/**
 * virtual node for html element
 */
class VElement extends VNode {
    /**
     * @param {String} tagName  element tag name
     */
    constructor (tagName) {
        super();

        this.nodeType = NodeType.ELEMENT;

        /**
         * tag name of the element
         * @type {String}
         */
        this.tagName = tagName.toUpperCase();

        /**
         * whether the element node is static
         * @type {Boolean}
         */
        this.static = false;

        /**
         * whether the element can be updated later
         */
        this._frozen = false;

        // element property getter functions
        this._getters = {
            attr: {},
            prop: {},
            style: {},
            class: []
        };

        this.attrs = {};
        this.props = {};
        this.styles = {};
        this.classes = [];

        this._eventHandles = {};
    }

    /**
     * @returns {Element}
     */
    _prepareElm () {
        if (!this.domNode) {
            var elm = document.createElement(this.tagName);
            this.domNode = elm;

            if (!this.static) {
                this._bindElmEvents(elm);
            }

            this.invokeHook('domNodeCreated');

            return elm;
        } else {
            return this.domNode;
        }
    }

    _bindElmEvents (elm) {
        utility.entries(this._eventHandles)
            .forEach(([evt, evtSet]) => {
                elm.addEventListener(evt, evtSet.callback);
            });
    }

    _discardElmEvents (elm) {
        utility.entries(this._eventHandles)
            .forEach(([evt, evtSet]) => {
                elm.removeEventListener(evt, evtSet.callback);
            });
    }

    _updateValueSet (valueSet, getters) {
        Object.keys(valueSet).forEach(k => {
            var getter = getters[k];
            if (getter) {
                valueSet[k] = getter(this);
            }
        });
    }

    _setValueSetItem (valueSet, getters, key, value) {
        if (utility.isFunc(value)) {
            getters[key] = value;
            valueSet[key] = null;
        } else {
            valueSet[key] = value;
        }
    }

    _getClassList () {
        return this._getters.class
            .map(c => {
                if (utility.isStr(c)) {
                    return c;
                } else if (utility.isFunc(c)) {
                    var cls = c(this);
                    return Array.isArray(cls) ? cls.join(' ') : cls;
                } else if (c instanceof ClassDecl) {
                    return c.isEnable(this) ? c.cls : '';
                } else {
                    return '';
                }
            })
            .filter(c => !!c);
    }

    _updateElementStates (elm) {
        utility.entries(this.attrs)
            .forEach(([attr, value]) => {
                if (value === undefined || value === false) {
                    elm.removeAttribute(attr);
                } else {
                    if (value === true) {
                        elm.setAttribute(attr, '');
                    } else {
                        elm.setAttribute(attr, String(value));
                    }
                }
            });

        utility.entries(this.props)
            .forEach(([prop, value]) => {
                elm[prop] = value;
            });

        // only update class attribute when getter exists, otherwise leave the class attribute as-is
        if (this._getters.class.length > 0) {
            var className = this.classes.join(' ');
            if (elm.className != className) {
                elm.className = className;
            }
        }

        utility.entries(this.styles)
            .forEach(([cssProp, value]) => {
                elm.style[normalizeCssPropName(cssProp)] = value;
            });
    }

    _ensureNotStatic (msg) {
        if (this.static) {
            throw new Error(msg);
        }
    }

    render () {
        var needUpdateElm = NODE.needCompute(this) && (!this.static || !this._frozen);
        if (needUpdateElm) {
            // update states of this virtual node
            this._updateValueSet(this.attrs, this._getters.attr);
            this._updateValueSet(this.props, this._getters.prop);
            this._updateValueSet(this.styles, this._getters.style);
            this.classes = this._getClassList();
        }

        // render children
        super.render();

        // make sure the bound element is initiated
        var elm = this._prepareElm();

        // sync dom nodes of child virtual nodes
        NODE.rearrangeElementChildNodes(elm, this.children);

        if (needUpdateElm) {
            // update element states
            this._updateElementStates(elm);

            // set `frozen` state
            if (this.static) {
                this._frozen = true;
            }
        }
    }

    destroy () {
        if (this.domNode) {
            this._discardElmEvents(this.domNode);
        }

        super.destroy();
    }

    /**
     * set attribute
     *
     * @param {String} attr  attribute name
     * @param {Any} value  attribute value or getter
     */
    setAttr (attr, value) {
        this._ensureNotStatic("cannot set attribute on static node");
        utility.ensureValidString(attr, 'attr');

        this._setValueSetItem(this.attrs, this._getters.attr, attr, value);
    }

    /**
     * remove attribue
     *
     * @param {String} attr  attribute name
     */
    removeAttr (attr) {
        this._ensureNotStatic("cannot remove attribute from static node");
        utility.ensureValidString(attr, 'attr');

        if (this.attrs.hasOwnProperty(attr)) {
            delete this._getters.attr[attr];
            this.attrs[attr] = undefined;
        }
    }

    /**
     * set property
     *
     * @param {String} prop  property name
     * @param {Any} value  property value or getter
     */
    setProp (prop, value) {
        this._ensureNotStatic("cannot set property of static node");
        utility.ensureValidString(prop, 'prop');

        this._setValueSetItem(this.props, this._getters.prop, prop, value);
    }

    /**
     * remove property
     *
     * @param {String} prop  property name
     */
    removeProp (prop) {
        this._ensureNotStatic("cannot remove property from static node");
        utility.ensureValidString(prop, 'prop');

        if (this.props.hasOwnProperty(prop)) {
            delete this.props[prop];
            delete this._getters.prop[prop];
        }
    }

    /**
     * set style
     *
     * @param {String} cssProp  css property name
     * @param {Any} value  css property value
     */
    setStyle (cssProp, value) {
        this._ensureNotStatic("cannot set style on static node");
        utility.ensureValidString(cssProp, 'cssProp');

        this._setValueSetItem(this.styles, this._getters.style, cssProp, value);
    }

    /**
     * remove style
     *
     * @param {String} cssProp  css property name
     */
    removeStyle (cssProp) {
        this._ensureNotStatic("cannot remove style from static node");
        utility.ensureValidString(cssProp, 'cssProp');

        if (this.styles.hasOwnProperty(cssProp)) {
            delete this._getters.style[cssProp];
            this.styles[cssProp] = undefined;
        }
    }

    /**
     * add a class
     *
     * @param {String|Function} cls  class name or getter
     * @param {function(VNode):Boolean=} value  class state getter
     */
    addClass (cls, value) {
        this._ensureNotStatic("cannot add class to static node");

        if (!utility.isFunc(cls)) {
            utility.ensureValidString(cls, 'cls');
        }

        if (utility.isFunc(value)) {
            if (utility.isStr(cls)) {
                this._getters.class.push(new ClassDecl(cls, value));
            } else {
                throw new TypeError("cls must be string when getter function is provided");
            }
        } else {
            this._getters.class.push(cls);
        }
    }

    /**
     * remove class
     *
     * @param {String|Function} cls  class name or getter
     */
    removeClass (cls) {
        this._ensureNotStatic("cannot remove class from static node");

        var clsList = this._getters.class;
        for (var i = 0; i < clsList.length; i++) {
            if ((clsList[i] instanceof ClassDecl && clsList[i].cls == cls) ||
                clsList[i] === cls) {
                clsList.splice(i, 1);
                return;
            }
        }
    }

    on (evt, callback) {
        this._ensureNotStatic("cannot register event handle on static node");
        utility.ensureValidString(evt, 'evt');

        if (!utility.isFunc(callback)) {
            throw new TypeError("callback must be function");
        }

        var evtSet = this._eventHandles[evt];
        if (!evtSet) {
            evtSet = createEventSet(evt, this);
            this._eventHandles[evt] = evtSet;

            if (this.domNode) {
                this.domNode.addEventListener(evt, evtSet.callback);
            }
        }

        if (evtSet.handles.indexOf(callback) < 0) {
            evtSet.handles.push(callback);
        }
    }

    off (evt, callback) {
        this._ensureNotStatic("cannot remove event handle from static node");
        utility.ensureValidString(evt, 'evt');

        var evtSet = this._eventHandles[evt];
        if (evtSet) {
            var index = evtSet.handles.indexOf(callback);
            if (index >= 0) {
                evtSet.handles.splice(index, 1);

                if (evtSet.handles.length === 0) {
                    delete this._eventHandles[evt];

                    if (this.domNode) {
                        this.domNode.removeEventListener(evt, evtSet.callback);
                    }
                }
            }
        }
    }
}

export default VElement;