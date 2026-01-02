import utility from '../../service/utility';


class IterAdaptor {
    /**
     * @param {Array|Iterator|Iterable} iter  iteration target
     * @param {Boolean=} keepValue  whether keep iteration values
     */
    constructor (iter, keepValue) {
        /**
         * iteration target
         *
         * @type {Array|Iterator}
         */
        this._iter = this._initIter(iter);

        /**
         * iteration counter
         *
         * @type {Number}
         */
        this._counter = 0;

        /**
         * whether iteration has ended
         *
         * @type {Boolean}
         */
        this._ended = false;

        /**
         * whether keep iteration values
         *
         * @type {Boolean}
         */
        this._keepValue = !!keepValue;

        /**
         * the iterated values
         *
         * @type {Array}
         */
        this._values = [];
    }

    /**
     * @param {Array|Iterator|Iterable} iter
     * @returns {Iterator}
     */
    _initIter (iter) {
        if (Array.isArray(iter) || utility.isIterator(iter)) {
            return iter;
        } else if (utility.isIterable(iter)) {
            return iter[Symbol.iterator]();
        } else {
            throw new TypeError("invalid iteration target");
        }
    }

    /**
     * get number of iterated values
     *
     * @returns {Number}
     */
    count () { return this._counter; }

    /**
     * check whether iteration has ended
     *
     * @returns {Boolean}
     */
    isEnded () { return this._ended; }

    /**
     * fetch iterated values as a readonly array
     *
     * @returns {Array}
     */
    values () { return this._values; }

    /**
     * loop through iterator values
     *
     * @param {(any, Number) => void} callback  loop callback
     */
    forEach (callback) {
        if (this._ended) {
            throw new Error("iterator is ended");
        }

        if (Array.isArray(this._iter)) {
            for (var i = 0; i < this._iter.length; i++) {
                callback(this._iter[i], i);
                this._counter++;
            }

            if (this._keepValue) {
                this._values = this._iter.slice(0);
            }
        } else {
            var result;
            while (!(result = this._iter.next()).done) {
                callback(result.value, this._counter);
                this._counter++;

                if (this._keepValue) {
                    this._values.push(result.value);
                }
            }
        }

        this._ended = true;
    }

    /**
     * @returns {Array}
     */
    flush () {
        var values;
        if (Array.isArray(this._iter)) {
            this._counter = this._iter.length;
            this._ended = true;

            values = this._iter.slice(0);

            if (this._keepValue) {
                this._values = values;
            }
        } else {
            values = [];
            this.forEach(v => {
                values.push(v);
            });
        }

        return values;
    }
}

export default IterAdaptor;