;(function(cee) {
    "use strict"

    function Watcher(editor, listener) {
        this.isWatching = false
        var contentObserver
        this.startWatching = function() {
            this.stopWatching()
            this.isWatching = true
            contentObserver = new MutationObserver(listener)
            contentObserver.observe(editor.$contentElt, {
                childList: true,
                subtree: true,
                characterData: true
            })
        }
        this.stopWatching = function() {
            if (contentObserver) {
                contentObserver.disconnect()
                contentObserver = undefined
            }
            this.isWatching = false
        }
        this.noWatch = function(cb) {
            if (this.isWatching === true) {
                this.stopWatching()
                cb()
                return this.startWatching()
            }
            cb()
        }
    }

    cee.Watcher = Watcher
})(window.cee)
