import utility from '../service/utility';


/**
 * expression base class
 *
 * @abstract
 * @template T  expression value type
 */
export class Expr {
    /**
     * @param {T=} defaultValue  default expression value
     */
    constructor (defaultValue) {
        /**
         * current expression value
         *
         * @type {T?}
         */
        this._value = defaultValue === undefined ? null : defaultValue;

        /**
         * previous expression value
         *
         * @type {T?}
         */
        this._prevValue = null;

        /**
         * expression value changed flag
         *
         * @type {Boolean}
         */
        this._changed = false;
    }

    /**
     * get current expression value
     *
     * @returns {T?}
     */
    value () {
        return this._value;
    }

    /**
     * get previous expression value
     *
     * @returns {T?}
     */
    prev () {
        return this._prevValue;
    }

    /**
     * check whether expression value has been changed
     *
     * @returns {Boolean}
     */
    check () {
        return this._changed;
    }

    /**
     * evaluate expression and get the new expression value
     *
     * @virtual
     *
     * @param {...any} args  evaluation arguments
     * @returns {T}  new expression value
     */
    eval (...args) { return; }

    /**
     * evaluate expression and get whether expression value changed
     *
     * @param {...any} args  evaluation arguments
     * @returns {Boolean}  whether expression value changed
     */
    evalChecked (...args) {
        this.eval(...args);
        return this._changed;
    }

    /**
     * force set expression value
     *
     * @virtual
     *
     * @param {T} value  new value to set
     * @returns {Boolean}  whether expression value is set successfully
     */
    set (value) {
        return false;
    }
}


/**
 * constant expression, the expression value will be decided on creation, and will only be checked once
 *
 * @template T
 */
export class ConstExpr extends Expr {
    /**
     * @param {T} constValue  the constant value
     */
    constructor (constValue) {
        super();

        this._value = constValue;
        this._evaled = false;
    }

    eval () {
        this._changed = !this._evaled;
        this._evaled = true;

        return this._value;
    }
}

/**
 * dynamic expression, the expression value is computed by getter function each time `eval` triggered
 *
 * @template T
 */
export class DynExpr extends Expr {
    /**
     * @param {function(...any):T} getter  the getter function
     * @param {any=} defaultValue
     */
    constructor (getter, defaultValue) {
        super(defaultValue);

        if (!utility.isFunc(getter)) {
            throw new TypeError("getter must be function");
        }

        /**
         * @type {function(...any):T}
         */
        this.$getter = getter;
    }

    eval (...args) {
        this._prevValue = this._value;
        this._value = this.$getter.apply(null, args);
        this._changed = this._value !== this._prevValue;

        return this._value;
    }
}

/**
 * reference expression, the expression can references an external value or can be set manually
 *
 * @template T
 */
export class RefExpr extends Expr {
    /**
     * @param {RefExpr<T>=} referred  the referred expression
     * @param {T=} defaultValue
     */
    constructor (referred, defaultValue) {
        super();

        /**
         * the referred expression
         *
         * @type {RefExpr<T>?}
         */
        this._referred = referred || null;

        /**
         * @type {Boolean}
         */
        this._setted = false;

        if (defaultValue !== undefined) {
            this.set(defaultValue);
        }
    }

    set (value) {
        if (!this._referred) {
            if (!this._setted) {
                this._prevValue = this._value;
                this._setted = true;
            }

            this._value = value;
            this._changed = this._value !== this._prevValue;
            return true;
        } else {
            // if referred expression exists, value of this expression is read from it each time,
            // so manually setting expression value is forbidden under this circumstance
            return false;
        }
    }

    eval () {
        if (this._referred) {
            this._prevValue = this._value;
            this._value = this._referred._value;
            this._changed = this._value !== this._prevValue;
        } else {
            if (this._setted) {
                this._setted = false;
            } else {
                this._prevValue = this._value;
                this._changed = false;
            }
        }

        return this._value;
    }
}