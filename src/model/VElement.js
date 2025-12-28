import VNode from './VNode';
import NodeType from './NodeType';
import EventTable from './internal/EventTable';
import { Expr, DynExpr, ConstExpr } from './Expr';

import utility from '../service/utility';
import { value2Expr } from '../service/expr';
import * as DOM from '../service/dom';


/**
 * @param {String} name
 * @return {String}
 */
function normalizeCssPropName (name) {
    if (name.charAt(0) == '-' && name.charAt(1) != '-') {
        name = name.substring(1);       // remove `-` before vendor specified property name
    }

    return utility.camel2KebabCase(name);
}

/**
 * @param {String} cls
 * @returns {String[]}
 */
function splitClassList (cls) {
    return cls.split(' ').map(c => c.trim()).filter(c => c.length > 0);
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
         * element attribute exprs
         *
         * @type {Record<String, Expr>}
         */
        this._attrs = {};
        /**
         * element property exprs
         *
         * @type {Record<String, Expr>}
         */
        this._props = {};
        /**
         * element style exprs
         *
         * @type {Record<String, Expr>}
         */
        this._styles = {};
        /**
         * element class exprs
         */
        this._classes = {
            /**
             * @type {Record<String, Expr<Boolean>>}
             */
            named: {},
            /**
             * @type {Expr<String|String[]>[]}
             */
            dynamic: []
        };

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
            // bind event handles
            this._bindElmEvents(elm);

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

    /**
     * @param {Element} elm
     */
    _updateElementNode (elm) {
        // eval and update element attributes
        utility.entries(this._attrs)
            .forEach(([attr, expr]) => {
                if (expr.evalChecked(this)) {
                    var value = expr.value();
                    if (value === undefined || value === false) {
                        elm.removeAttribute(attr);
                    } else {
                        if (value === true) {
                            elm.setAttribute(attr, '');
                        } else {
                            elm.setAttribute(attr, String(value));
                        }
                    }
                }
            });

        // eval and update element properties
        utility.entries(this._props)
            .forEach(([prop, expr]) => {
                if (expr.evalChecked(this)) {
                    elm[prop] = expr.value();
                }
            });

        // eval and update element class
        var clsHasChange = false;
        var clsSet = new Set();

        utility.entries(this._classes.named)
            .forEach(([cls, expr]) => {
                if (expr.eval(this)) {
                    clsSet.add(cls);
                }

                if (expr.check()) {
                    clsHasChange = true;
                }
            });

        this._classes.dynamic.forEach(expr => {
            var cls = expr.eval(this);
            cls = Array.isArray(cls) ? cls : splitClassList(cls);

            for (let c of cls) {
                clsSet.add(c);
            }

            if (expr.check()) {
                clsHasChange = true;
            }
        });

        if (clsHasChange) {
            elm.className = Array.from(clsSet).join(' ');
        }

        // eval and update element styles
        utility.entries(this._styles)
            .forEach(([cssProp, expr]) => {
                if (expr.evalChecked(this)) {
                    var value = expr.value();
                    elm.style[cssProp] = !!value ? value : '';
                }
            });
    }

    compute () {
        // make sure the bound element is initiated
        var elm = this._prepareElm();

        // update element attrs/props/styles/classes
        this._updateElementNode(elm);
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
     * @param {any} value  attribute value or expression
     */
    setAttr (attr, value) {
        utility.ensureValidString(attr, 'attr');
        this._attrs[attr] = value2Expr(value);
    }

    /**
     * remove attribue
     *
     * @param {String} attr  attribute name
     */
    removeAttr (attr) {
        utility.ensureValidString(attr, 'attr');
        delete this._attrs[attr];
    }

    /**
     * set property
     *
     * @param {String} prop  property name
     * @param {any} value  property value or expression
     */
    setProp (prop, value) {
        utility.ensureValidString(prop, 'prop');
        this._props[prop] = value2Expr(value);
    }

    /**
     * remove property
     *
     * @param {String} prop  property name
     */
    removeProp (prop) {
        utility.ensureValidString(prop, 'prop');
        delete this._props[prop];
    }

    /**
     * set style
     *
     * @param {String} cssProp  css property name
     * @param {any} value  css property value or expression
     */
    setStyle (cssProp, value) {
        utility.ensureValidString(cssProp, 'cssProp');
        this._styles[normalizeCssPropName(cssProp)] = value2Expr(value);
    }

    /**
     * remove style
     *
     * @param {String} cssProp  css property name
     */
    removeStyle (cssProp) {
        utility.ensureValidString(cssProp, 'cssProp');
        delete this._styles[normalizeCssPropName(cssProp)];
    }

    /**
     * add a class
     *
     * @param {String|String[]|function(VNode):String|String[]} cls  class property name or getter
     * @param {(function(VNode):Boolean|Expr<Boolean>)=} switcher  class switcher function or expression
     */
    addClass (cls, switcher) {
        if (utility.isFunc(cls)) {
            this._classes.dynamic.push(new DynExpr(cls));
        } else {
            var clsProps = Array.isArray(cls) ? cls : splitClassList(cls);
            for (let prop of clsProps) {
                if (switcher) {
                    this._classes.named[prop] = value2Expr(switcher);
                } else {
                    this._classes.named[prop] = new ConstExpr(true);
                }
            }
        }
    }

    /**
     * remove class
     *
     * @param {String|String[]} cls  class property name
     */
    removeClass (cls) {
        var clsProps = Array.isArray(cls) ? cls : splitClassList(cls);
        for (let prop of clsProps) {
            delete this._classes.named[prop];
        }
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