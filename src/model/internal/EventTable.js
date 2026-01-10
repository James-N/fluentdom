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
            handlers: []
        };
    }

    _createEventFlags () {
        return {
            /**
             * the handler will be deregistered after first invocation
             */
            once: false
        };
    }

    /**
     * register a new event handler, create event set if not exists
     *
     * @param {String} name  event name
     * @param {Function} handler  the new event handler
     * @param {EventFlags=} flags  handler flags
     *
     * @returns {EventSet}
     */
    add (name, handler, flags) {
        // ensure event set existance
        var evtSet = this.events[name];
        if (!evtSet) {
            evtSet = this._createEventSet(name);
            this.events[name] = evtSet;
        }

        // save flags attribute
        flags = utility.extend(this._createEventFlags(), flags);
        handler.$flags = flags;

        // register handler
        evtSet.handlers.push(handler);

        return evtSet;
    }

    /**
     * deregister handler from event set, or remove the whole event if no handler specified
     *
     * @param {String} name  event name
     * @param {Function=} handler  the handler to remove
     *
     * @returns {Boolean}
     */
    remove (name, handler) {
        var evtSet = this.events[name];
        if (evtSet) {
            if (handler) {
                var idx = evtSet.handlers.indexOf(handler);
                if (idx >= 0) {
                    evtSet.handlers.splice(idx, 1);
                    return true;
                } else {
                    return false;
                }
            } else {
                evtSet.handlers.length = 0;
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * remove event set when it has no registered handlers
     *
     * @param {String} name  event name
     * @returns {Boolean}
     */
    removeSetIfEmpty (name) {
        var evtSet = this.events[name];
        if (evtSet && evtSet.handlers.length === 0) {
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
     * invoke event handlers
     *
     * @param {String} name  event set name
     * @param {any} thisArg  the value to be passed as the this parameter to the handlers
     * @param  {...any} args  invocation arguments
     */
    invoke (name, thisArg, ...args) {
        var evtSet = this.events[name];
        if (evtSet) {
            for (var i = 0; i < evtSet.handlers.length; i++) {
                var handler = evtSet.handlers[i];
                try {
                    handler.apply(thisArg, args);
                } catch (err) {
                    LOG.error(`error invoking ${this.id} event [${name}] handler`, err);
                }

                // remove handler with `once` flag
                if (handler.$flags.once) {
                    evtSet.handlers.splice(i, 1);
                    i--;
                }
            }
        }
    }
}

export default EventTable;