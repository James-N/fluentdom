import VNode from './VNode';
import NodeType from './NodeType';
import EventTable from './internal/EventTable';

import utility from '../service/utility';
import * as DOM from '../service/dom';


/**
 * @param {String} name
 * @return {String}
 */
function normalizeCssPropName (name) {
    if (name.charAt(0) == '-') {
        name = name.substring(1);
    }

    return utility.kebab2CamelCase(name);
}

/**
 * @param {String} cls
 * @returns {String[]}
 */
function splitClassList (cls) {
    return cls.split(' ').map(c => c.trim()).filter(c => c.length > 0);
}

class ClassDecl {
    constructor (cls, getter) {
        this.cls = cls;
        this._getter = getter;
    }

    isEnable (vn) {
        return utility.isFunc(this._getter) ? !!this._getter.call(null, vn) : !!this._getter;
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

        utility.ensureValidString(tagName, 'tagName');
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
         * @type {Boolean}
         */
        this._frozen = false;

        /**
         * element property getter functions
         */
        this._getters = {
            attr: {},
            prop: {},
            style: {},
            class: []
        };

        /**
         * element attributes
         */
        this.attrs = {};
        /**
         * element properties
         */
        this.props = {};
        /**
         * element styles
         */
        this.styles = {};
        /**
         * element classes
         */
        this.classes = [];

        /**
         * element event registration
         */
        this._events = new EventTable("VElement::events");
        /**
         * element event trigger callback table
         *
         * @type {Record<String, Function>}
         */
        this._eventTriggers = {};
    }

    /**
     * @returns {Element}
     */
    _prepareElm () {
        if (!this.domNode) {
            // create element node
            var elm = DOM.createEl(this.tagName);
            this.domNode = elm;
            // bind event handles if necessary
            if (!this.static) {
                this._bindElmEvents(elm);
            }

            // update reflow flag
            this.$flags.reflow = true;
            // trigger `domNodeCreated` hook
            this.invokeHook('domNodeCreated');

            return elm;
        } else {
            return this.domNode;
        }
    }

    _bindElmEvents (elm) {
        utility.entries(this._eventTriggers)
            .forEach(([evt, cb]) => {
                elm.addEventListener(evt, cb);
            });
    }

    _discardElmEvents (elm) {
        utility.entries(this._eventTriggers)
            .forEach(([evt, cb]) => {
                elm.removeEventListener(evt, cb);
            });

        this._events.clear();
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
                var cls;
                if (utility.isFunc(c)) {
                    cls = c(this);
                } else {
                    cls = c.isEnable(this) ? c.cls : '';
                }

                return Array.isArray(cls) ? cls.join(' ') : cls;
            })
            .filter(c => !!c);
    }

    /**
     * @param {Element} elm
     */
    _updateElementNode (elm) {
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

    compute () {
        // make sure the bound element is initiated
        var elm = this._prepareElm();

        var needRecompute = !this.static || !this._frozen;
        if (needRecompute) {
            // update states of this virtual node
            this._updateValueSet(this.attrs, this._getters.attr);
            this._updateValueSet(this.props, this._getters.prop);
            this._updateValueSet(this.styles, this._getters.style);
            this.classes = this._getClassList();

            // update element states
            this._updateElementNode(elm);

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

        if (utility.hasOwn(this.attrs, attr)) {
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

        if (utility.hasOwn(this.props, prop)) {
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

        if (utility.hasOwn(this.styles, cssProp)) {
            delete this._getters.style[cssProp];
            this.styles[cssProp] = undefined;
        }
    }

    /**
     * add a class
     *
     * @param {String|Function} cls  class name or getter
     * @param {function(VNode):Boolean?=} value  class state getter
     */
    addClass (cls, value) {
        this._ensureNotStatic("cannot add class to static node");

        if (utility.isFunc(cls)) {
            this._getters.class.push(cls);
        } else {
            utility.ensureValidString(cls, 'cls');

            splitClassList(cls).forEach(c => {
                this._getters.class.push(new ClassDecl(c, utility.isNullOrUndef(value) ? true : value));
            });
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
        splitClassList(cls).forEach(c => {
            for (var i = 0; i < clsList.length; i++) {
                if (clsList[i] === c ||
                    (clsList[i] instanceof ClassDecl && clsList[i].cls == c)) {
                    clsList.splice(i, 1);
                    return;
                }
            }
        });
    }

    /**
     * register element event
     *
     * @param {String} name  event name
     * @param {Function} callback  event callback
     * @param {Record<String, Boolean>=} flags  callback flags
     */
    on (name, callback, flags) {
        /**
         * @param {VElement} self
         */
        function makeTriggerCallback (self) {
            function triggerCallback (evt) {
                self._events.invoke(name, self, evt, self);

                if (self._events.removeSetIfEmpty(name)) {
                    // delete cached trigger callback
                    delete self._eventTriggers[name];
                    // unbind trigger callback from dom node
                    self.domNode.removeEventListener(name, triggerCallback);
                }
            }

            return triggerCallback;
        }

        this._ensureNotStatic("cannot register event handle on static node");
        utility.ensureValidString(name, 'name');

        if (!utility.isFunc(callback)) {
            throw new TypeError("callback must be function");
        }

        var evtSet = this._events.add(name, callback, flags);
        if (evtSet.callbacks.length == 1) {
            // create trigger callback
            var triggerCb = makeTriggerCallback(this);
            // cache trigger callback
            this._eventTriggers[name] = triggerCb;
            // bind trigger callback to dom node if necessary
            if (this.domNode) {
                this.domNode.addEventListener(name, triggerCb);
            }
        }
    }

    /**
     * unregister element event
     *
     * @param {String} name  event name
     * @param {Function=} callback  event callback
     *
     * @returns {Boolean}
     */
    off (name, callback) {
        this._ensureNotStatic("cannot remove event handle from static node");
        utility.ensureValidString(name, 'name');

        if (this._events.remove(name, callback) && this._events.removeSetIfEmpty()) {
            var triggerCb = this._eventTriggers[name];
            // delete cached trigger callback
            delete this._eventTriggers[name];

            // unbind trigger callback from dom node if necessary
            if (this.domNode) {
                this.domNode.removeEventListener(name, triggerCb);
            }
        }
    }
}

export default VElement;