(function(cee, _) {
    "use strict"
    
    function SelectionMgr(editor) {
        var debounce = _.debounce
        var contentElt = editor.$contentElt
        var scrollElt = editor.$scrollElt
        cee.Utils.createEventHooks(this)

        var self = this
        var lastSelectionStart = 0,
            lastSelectionEnd = 0
        this.selectionStart = 0
        this.selectionEnd = 0
        this.cursorCoordinates = {}
        this.adjustTop = 0
        this.adjustBottom = 0

        this.findContainer = function(offset) {
            var result = cee.Utils.findContainer(contentElt, offset)
            if (result.container.nodeValue === '\n') {
                var hdLfElt = result.container.parentNode
                if (hdLfElt.className === 'hd-lf' && hdLfElt.previousSibling && hdLfElt.previousSibling.tagName === 'BR') {
                    result.container = hdLfElt.parentNode
                    result.offsetInContainer = Array.prototype.indexOf.call(result.container.childNodes, result.offsetInContainer === 0 ? hdLfElt.previousSibling : hdLfElt)
                }
            }
            return result
        }

        this.createRange = function(start, end) {
            var range = editor.$document.createRange()
            if (start === end) {
                end = start = isNaN(start) ? start : this.findContainer(start < 0 ? 0 : start)
            } else {
                start = isNaN(start) ? start : this.findContainer(start < 0 ? 0 : start)
                end = isNaN(end) ? end : this.findContainer(end < 0 ? 0 : end)
            }
            range.setStart(start.container, start.offsetInContainer)
            range.setEnd(end.container, end.offsetInContainer)
            return range
        }

        var adjustScroll
        var debouncedUpdateCursorCoordinates = debounce(function() {
            var coordinates = this.getCoordinates(this.selectionEnd, this.selectionEndContainer, this.selectionEndOffset)
            if (this.cursorCoordinates.top !== coordinates.top ||
                this.cursorCoordinates.height !== coordinates.height ||
                this.cursorCoordinates.left !== coordinates.left
            ) {
                this.cursorCoordinates = coordinates
                this.$trigger('cursorCoordinatesChanged', coordinates)
            }
            if (adjustScroll) {
                var adjustTop, adjustBottom
                adjustTop = adjustBottom = scrollElt.clientHeight / 2 * editor.options.cursorFocusRatio
                adjustTop = this.adjustTop || adjustTop
                adjustBottom = this.adjustBottom || adjustBottom
                if (adjustTop && adjustBottom) {
                    var cursorMinY = scrollElt.scrollTop + adjustTop
                    var cursorMaxY = scrollElt.scrollTop + scrollElt.clientHeight - adjustBottom
                    if (this.cursorCoordinates.top < cursorMinY) {
                        scrollElt.scrollTop += this.cursorCoordinates.top - cursorMinY
                    } else if (this.cursorCoordinates.top + this.cursorCoordinates.height > cursorMaxY) {
                        scrollElt.scrollTop += this.cursorCoordinates.top + this.cursorCoordinates.height - cursorMaxY
                    }
                }
            }
            adjustScroll = false
        }.bind(this))

        this.updateCursorCoordinates = function(adjustScrollParam) {
            adjustScroll = adjustScroll || adjustScrollParam
            debouncedUpdateCursorCoordinates()
        }

        var oldSelectionRange

        function checkSelection(selectionRange) {
            if (!oldSelectionRange ||
                oldSelectionRange.startContainer !== selectionRange.startContainer ||
                oldSelectionRange.startOffset !== selectionRange.startOffset ||
                oldSelectionRange.endContainer !== selectionRange.endContainer ||
                oldSelectionRange.endOffset !== selectionRange.endOffset
            ) {
                oldSelectionRange = selectionRange
                self.$trigger('selectionChanged', self.selectionStart, self.selectionEnd, selectionRange)
                return true
            }
        }

        this.restoreSelection = function() {
            var min = Math.min(this.selectionStart, this.selectionEnd)
            var max = Math.max(this.selectionStart, this.selectionEnd)
            var selectionRange = this.createRange(min, max)
            var selection = editor.$window.getSelection()
            selection.removeAllRanges()
            var isBackward = this.selectionStart > this.selectionEnd
            if (isBackward && selection.extend) {
                var endRange = selectionRange.cloneRange()
                endRange.collapse(false)
                selection.addRange(endRange)
                selection.extend(selectionRange.startContainer, selectionRange.startOffset)
            } else {
                selection.addRange(selectionRange)
            }
            checkSelection(selectionRange)
            return selectionRange
        }

        var saveLastSelection = debounce(function() {
            lastSelectionStart = self.selectionStart
            lastSelectionEnd = self.selectionEnd
        }, 50)

        this.getLastSelection = function() {
            return {
                start: lastSelectionStart,
                end: lastSelectionEnd
            }
        }

        function setSelection(start, end) {
            if (start === undefined) {
                start = self.selectionStart
            }
            if (start < 0) {
                start = 0
            }
            if (end === undefined) {
                end = self.selectionEnd
            }
            if (end < 0) {
                end = 0
            }
            self.selectionStart = start
            self.selectionEnd = end
            saveLastSelection()
        }

        this.setSelectionStartEnd = function(start, end, focus) {
            setSelection(start, end)
            return focus !== false && this.restoreSelection()
        }

        this.saveSelectionState = (function() {
            // Credit: https://github.com/timdown/rangy
            function arrayContains(arr, val) {
                var i = arr.length
                while (i--) {
                    if (arr[i] === val) {
                        return true
                    }
                }
                return false
            }

            function getClosestAncestorIn(node, ancestor, selfIsAncestor) {
                var p, n = selfIsAncestor ? node : node.parentNode
                while (n) {
                    p = n.parentNode
                    if (p === ancestor) {
                        return n
                    }
                    n = p
                }
                return null
            }

            function getNodeIndex(node) {
                var i = 0
                while ((node = node.previousSibling)) {
                    ++i
                }
                return i
            }

            function getCommonAncestor(node1, node2) {
                var ancestors = [],
                    n
                for (n = node1; n; n = n.parentNode) {
                    ancestors.push(n)
                }

                for (n = node2; n; n = n.parentNode) {
                    if (arrayContains(ancestors, n)) {
                        return n
                    }
                }

                return null
            }

            function comparePoints(nodeA, offsetA, nodeB, offsetB) {
                // See http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Comparing
                var nodeC, root, childA, childB, n
                if (nodeA === nodeB) {
                    // Case 1: nodes are the same
                    return offsetA === offsetB ? 0 : (offsetA < offsetB) ? -1 : 1
                } else if ((nodeC = getClosestAncestorIn(nodeB, nodeA, true))) {
                    // Case 2: node C (container B or an ancestor) is a child node of A
                    return offsetA <= getNodeIndex(nodeC) ? -1 : 1
                } else if ((nodeC = getClosestAncestorIn(nodeA, nodeB, true))) {
                    // Case 3: node C (container A or an ancestor) is a child node of B
                    return getNodeIndex(nodeC) < offsetB ? -1 : 1
                } else {
                    root = getCommonAncestor(nodeA, nodeB)
                    if (!root) {
                        throw new Error('comparePoints error: nodes have no common ancestor')
                    }

                    // Case 4: containers are siblings or descendants of siblings
                    childA = (nodeA === root) ? root : getClosestAncestorIn(nodeA, root, true)
                    childB = (nodeB === root) ? root : getClosestAncestorIn(nodeB, root, true)

                    if (childA === childB) {
                        // This shouldn't be possible
                        throw module.createError('comparePoints got to case 4 and childA and childB are the same!')
                    } else {
                        n = root.firstChild
                        while (n) {
                            if (n === childA) {
                                return -1
                            } else if (n === childB) {
                                return 1
                            }
                            n = n.nextSibling
                        }
                    }
                }
            }

            function save() {
                var selectionStart = self.selectionStart
                var selectionEnd = self.selectionEnd
                var selection = editor.$window.getSelection()
                var result
                if (selection.rangeCount > 0) {
                    var selectionRange = selection.getRangeAt(0)
                    var node = selectionRange.startContainer
                    if ((contentElt.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINED_BY) || contentElt === node) {
                        var offset = selectionRange.startOffset
                        if (node.firstChild && offset > 0) {
                            node = node.childNodes[offset - 1]
                            offset = node.textContent.length
                        }
                        var container = node
                        while (node !== contentElt) {
                            while ((node = node.previousSibling)) {
                                offset += (node.textContent || '').length
                            }
                            node = container = container.parentNode
                        }
                        var selectionText = selectionRange + ''
                        // Fix end of line when only br is selected
                        var brElt = selectionRange.endContainer.firstChild
                        if (brElt && brElt.tagName === 'BR' && selectionRange.endOffset === 1) {
                            selectionText += '\n'
                        }
                        if (comparePoints(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset) === 1) {
                            selectionStart = offset + selectionText.length
                            selectionEnd = offset
                        } else {
                            selectionStart = offset
                            selectionEnd = offset + selectionText.length
                        }

                        if (selectionStart === selectionEnd && selectionStart === editor.getContent().length) {
                            // If cursor is after the trailingNode
                            selectionStart = --selectionEnd
                            result = self.setSelectionStartEnd(selectionStart, selectionEnd)
                        } else {
                            setSelection(selectionStart, selectionEnd)
                            result = checkSelection(selectionRange)
                            result = result || lastSelectionStart !== self.selectionStart // selectionRange doesn't change when selection is at the start of a section
                        }
                    }
                }
                return result
            }

            function saveCheckChange() {
                return save() && (lastSelectionStart !== self.selectionStart || lastSelectionEnd !== self.selectionEnd)
            }

            var nextTickAdjustScroll = false
            var debouncedSave = debounce(function() {
                self.updateCursorCoordinates(saveCheckChange() && nextTickAdjustScroll)
                // In some cases we have to wait a little longer to see the selection change (Cmd+A on Chrome OSX)
                longerDebouncedSave()
            })
            var longerDebouncedSave = debounce(function() {
                self.updateCursorCoordinates(saveCheckChange() && nextTickAdjustScroll)
                nextTickAdjustScroll = false
            }, 10)

            return function(debounced, adjustScroll, forceAdjustScroll) {
                if (forceAdjustScroll) {
                    lastSelectionStart = undefined
                    lastSelectionEnd = undefined
                }
                if (debounced) {
                    nextTickAdjustScroll = nextTickAdjustScroll || adjustScroll
                    return debouncedSave()
                } else {
                    save()
                }
            }
        })()

        this.getSelectedText = function() {
            var min = Math.min(this.selectionStart, this.selectionEnd)
            var max = Math.max(this.selectionStart, this.selectionEnd)
            return editor.getContent().substring(min, max)
        }

        this.getCoordinates = function(inputOffset, container, offsetInContainer) {
            if (!container) {
                var offset = this.findContainer(inputOffset)
                container = offset.container
                offsetInContainer = offset.offsetInContainer
            }
            var containerElt = container
            if (!containerElt.hasChildNodes()) {
                containerElt = container.parentNode
            }
            var isInvisible = false
            var index = editor.$allElements.indexOf(containerElt)
            while (containerElt.offsetHeight === 0 && index > 0) {
                isInvisible = true
                containerElt = editor.$allElements[--index]
            }
            var rect,
                contentRect,
                left = 'left'
            if (isInvisible || container.textContent === '\n') {
                rect = containerElt.getBoundingClientRect()
            } else {
                var selectedChar = editor.getContent()[inputOffset]
                var startOffset = {
                    container: container,
                    offsetInContainer: offsetInContainer
                }
                var endOffset = {
                    container: container,
                    offsetInContainer: offsetInContainer
                }
                if (inputOffset > 0 && (selectedChar === undefined || selectedChar === '\n')) {
                    left = 'right'
                    if (startOffset.offsetInContainer === 0) {
                        // Need to calculate offset-1
                        startOffset = inputOffset - 1
                    } else {
                        startOffset.offsetInContainer -= 1
                    }
                } else {
                    if (endOffset.offsetInContainer === container.textContent.length) {
                        // Need to calculate offset+1
                        endOffset = inputOffset + 1
                    } else {
                        endOffset.offsetInContainer += 1
                    }
                }
                var range = this.createRange(startOffset, endOffset)
                rect = range.getBoundingClientRect()
            }
            contentRect = contentElt.getBoundingClientRect()
            return {
                top: Math.round(rect.top - contentRect.top + contentElt.scrollTop),
                height: Math.round(rect.height),
                left: Math.round(rect[left] - contentRect.left + contentElt.scrollLeft)
            }
        }

        this.getClosestWordOffset = function(offset) {
            var offsetStart = 0
            var offsetEnd = 0
            var nextOffset = 0
            _.some(editor.getContent().split(/\s/), function(word) {
                if (word) {
                    offsetStart = nextOffset
                    offsetEnd = nextOffset + word.length
                    if (offsetEnd > offset) {
                        return true
                    }
                }
                nextOffset += word.length + 1
            })
            return {
                start: offsetStart,
                end: offsetEnd
            }
        }
    }

    cee.SelectionMgr = SelectionMgr
})(window.cee, window._)
