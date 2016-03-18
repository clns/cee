;(function(cee) {
    "use strict"

    var _ = cee._

    var Utils = {
        isGecko: 'MozAppearance' in document.documentElement.style,
        isWebkit: 'WebkitAppearance' in document.documentElement.style,
        isMsie: 'msTransform' in document.documentElement.style,
        isMac: navigator.userAgent.indexOf('Mac OS X') !== -1
    }

    Utils.createEventHooks = function(object) {
        var listenerMap = {}
        object.$trigger = function(eventType) {
            var listeners = listenerMap[eventType]
            if (listeners) {
                var args = Array.prototype.slice.call(arguments, 1)
                _.forEach(listeners, function(listener) {
                    try {
                        listener.apply(object, args)
                    } catch (e) {
                        window.console.error(e.message, e.stack)
                    }
                })
            }
        }
        object.on = function(eventType, listener) {
            var listeners = listenerMap[eventType]
            if (!listeners) {
                listeners = []
                listenerMap[eventType] = listeners
            }
            listeners.push(listener)
        }
        object.off = function(eventType, listener) {
            var listeners = listenerMap[eventType]
            if (listeners) {
                var index = listeners.indexOf(listener)
                if (index > -1) {
                    listeners.splice(index, 1)
                }
            }
        }
    }

    cee.Utils = Utils
})(window.cee)
