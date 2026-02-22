import utility from '../../service/utility';
import LOG from '../../service/log';


/**
 * @typedef {ReturnType<createEventFlags>} EventFlags
 */

/**
 * @typedef EventHandler
 * @property {Function} fn  handler function
 * @property {EventFlags} flags  handler flags
 */


function createEventFlags () {
    return {
        /**
         * the handler will be deregistered after first invocation
         */
        once: false
    };
}

/**
 * class holds event handlers for single evnet
 */
class EventSet {
    /**
     * @param {String} name  event name
     */
    constructor (name) {
        /**
         * event name
         *
         * @type {String}
         */
        this.name = name;

        /**
         * event handlers
         *
         * @type {EventHandler[]}
         */
        this.handlers = [];
    }

    /**
     * number of handlers
     */
    get length () {
        return this.handlers.length;
    }

    /**
     * add new event handler
     *
     * @param {Function} handler  event handler function
     * @param {EventFlags=} flags  event handler flags
     */
    add (handler, flags) {
        this.handlers.push({
            fn: handler,
            flags: utility.extend(createEventFlags(), flags)
        });
    }

    /**
     * remove event handler
     *
     * @param {Function} handler  event handler function to remove
     * @returns {Boolean}
     */
    remove (handler) {
        if (handler) {
            for (let i = 0; i < this.handlers.length; i++) {
                if (this.handlers[i].fn === handler) {
                    this.handlers.splice(i, 1);
                    return true;
                }

                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * remove all event handlers
     */
    clear () {
        this.handlers.length = 0;
    }

    /**
     * invoke event handlers
     *
     * @param {any=} thisArg  the value to be passed as the `this` parameter to the handlers
     * @param  {...any} args  invocation arguments
     */
    invoke (thisArg, ...args) {
        var handlers = this.handlers;
        for (var i = 0; i < handlers.length; i++) {
            var handler = handlers[i];
            try {
                handler.fn.apply(thisArg, args);
            } catch (err) {
                LOG.error(`error invoking [${this.name}] event handler`, err);
            }

            // remove handler with `once` flag
            if (handler.flags.once) {
                handlers.splice(i, 1);
                i--;
            }
        }
    }
}

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
            evtSet = new EventSet(`${this.id}::${name}`);
            this.events[name] = evtSet;
        }

        // register handler
        evtSet.add(handler, flags);

        return evtSet;
    }

    /**
     * deregister handler from event set, or remove the whole event if no handler specified
     *
     * @param {String} name  event name
     * @param {Function=} handler  the handler function to remove
     *
     * @returns {Boolean}
     */
    remove (name, handler) {
        var evtSet = this.events[name];
        if (evtSet) {
            if (handler) {
                return evtSet.remove(handler);
            } else {
                evtSet.clear();
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
        if (evtSet && evtSet.length === 0) {
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
            evtSet.invoke(thisArg, ...args);
        }
    }
}

export { EventSet };
export default EventTable;