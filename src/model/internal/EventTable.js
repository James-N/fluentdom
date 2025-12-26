import utility from '../../service/utility';
import LOG from '../../service/log';


/**
 * @typedef {ReturnType<typeof EventTable.prototype._createEventSet>} EventSet
 * @typedef {ReturnType<typeof EventTable.prototype._createEventFlags>} EventFlags
 */

class EventTable {
    /**
     * @param {String} id  table id
     */
    constructor (id) {
        /**
         * @type {Record<String, EventSet>}
         */
        this.events = {};

        /**
         * table id
         *
         * @type {String}
         */
        this.id = id;
    }

    /**
     * @param {String} name  event set name
     */
    _createEventSet (name) {
        return {
            /**
             * @type {String}
             */
            name: name,
            /**
             * @type {Function[]}
             */
            callbacks: []
        };
    }

    _createEventFlags () {
        return {
            /**
             * the callback will be deregistered after first invocation
             */
            once: false
        };
    }

    /**
     * register a new event callback, create event set if not exists
     *
     * @param {String} name  event name
     * @param {Function} callback  the new event callback
     * @param {EventFlags=} flags  callback flags
     *
     * @returns {EventSet}
     */
    add (name, callback, flags) {
        // ensure event set existance
        var evtSet = this.events[name];
        if (!evtSet) {
            evtSet = this._createEventSet(name);
            this.events[name] = evtSet;
        }

        // save flags attribute
        flags = utility.extend(this._createEventFlags(), flags);
        callback.$flags = flags;

        // register callback
        evtSet.callbacks.push(callback);

        return evtSet;
    }

    /**
     * deregister callback from event set, or remove the whole event if no callback specified
     *
     * @param {String} name  event name
     * @param {Function=} callback  the callback to remove
     *
     * @returns {Boolean}
     */
    remove (name, callback) {
        var evtSet = this.events[name];
        if (evtSet) {
            if (callback) {
                var idx = evtSet.callbacks.indexOf(callback);
                if (idx >= 0) {
                    evtSet.callbacks.splice(idx, 1);
                    return true;
                } else {
                    return false;
                }
            } else {
                evtSet.callbacks.length = 0;
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * remove event set when it has no registered callbacks
     *
     * @param {String} name  event name
     * @returns {Boolean}
     */
    removeSetIfEmpty (name) {
        var evtSet = this.events[name];
        if (evtSet && evtSet.callbacks.length === 0) {
            delete this.events[name];
            return true;
        } else {
            return false;
        }
    }

    /**
     * remove all event sets
     */
    clear () {
        this.events = {};
    }

    /**
     * invoke event callbacks
     *
     * @param {String} name  event set name
     * @param {any} thisArg  the value to be passed as the this parameter to the callbacks
     * @param  {...any} args  invocation arguments
     */
    invoke (name, thisArg, ...args) {
        var evtSet = this.events[name];
        if (evtSet) {
            for (var i = 0; i < evtSet.callbacks.length; i++) {
                var callback = evtSet.callbacks[i];
                try {
                    callback.apply(thisArg, args);
                } catch (err) {
                    LOG.error(`error invoking ${this.id} event [${name}] callback`, err);
                }

                // remove callback with `once` flag
                if (callback.$flags.once) {
                    evtSet.callbacks.splice(i, 1);
                    i--;
                }
            }
        }
    }
}

export default EventTable;