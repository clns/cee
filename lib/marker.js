(function(cee, _) {
    var DIFF_DELETE = -1
    var DIFF_INSERT = 1
    var DIFF_EQUAL = 0

    var idCounter = 0

    function Marker(offset) {
        this.id = idCounter++
        this.offset = offset
    }

    Marker.prototype.adjustOffset = function(diffs) {
        var startOffset = 0
        _.each(diffs, function(diff) {
            var diffType = diff[0]
            var diffText = diff[1]
            var diffOffset = diffText.length
            switch (diffType) {
                case DIFF_EQUAL:
                    startOffset += diffOffset
                    break
                case DIFF_INSERT:
                    if (this.offset > startOffset) {
                        this.offset += diffOffset
                    }
                    startOffset += diffOffset
                    break
                case DIFF_DELETE:
                    if (this.offset > startOffset) {
                        this.offset -= diffOffset
                    }
                    break
            }
        }.bind(this))
    }

    cee.Marker = Marker
})(window.cee, window._)
