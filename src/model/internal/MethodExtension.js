import global from '../../service/global';
import utility from '../../service/utility';


/**
 * helper class to support registering extension methods on base classes
 */
class MethodExtension {
    constructor () {
        var thisCls = utility.classOf(this);
        if (!thisCls) {
            throw new Error("cannot detect instance class");
        }

        return new global.Proxy(this, {
            get (target, prop, receiver) {
                var propVal = target[prop];
                if (propVal !== undefined) {
                    return propVal;
                } else {
                    var cls = thisCls;
                    while (cls && cls !== MethodExtension) {
                        var method = cls.$$extension && cls.$$extension[prop];
                        if (method) {
                            return method;
                        } else {
                            cls = utility.baseClassOf(cls);
                        }
                    }

                    return undefined;
                }
            }
        });
    }
}

/**
 * static helper fucntion to register extension methods to class
 *
 * @param {any} cls  class or list of class to extend methods to
 * @param {Record<String, Function>} methods  set of methods to extend
 */
MethodExtension.extend = function (cls, methods) {
    cls = utility.ensureArr(cls);

    for (let c of cls) {
        if (!utility.isSubclass(c, MethodExtension)) {
            throw new TypeError("invalid class to extend");
        }
    }

    if (!methods) {
        throw new Error("method is null");
    }

    // extract methods to extend
    var extMethods = utility.entries(methods).filter(m => utility.isFunc(m[1]));

    for (let c of cls) {
        // create or init extension set
        var extension = c.$$extension;
        if (!extension) {
            extension = {};
            c.$$extension = extension;
        }

        // register methods
        for (let [name, method] of extMethods) {
            extension[name] = method;
        }
    }
};


export default MethodExtension;