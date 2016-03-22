(function(cee, diff_match_patch, _) {
    function UndoMgr(editor, options) {
        cee.Utils.createEventHooks(this)

        options = _.extend({
            undoStackMaxSize: 200,
            bufferStateUntilIdle: 1000
        }, options || {})

        var self = this
        var selectionMgr
        var undoStack = []
        var redoStack = []
        var currentState
        var previousPatches = []
        var currentPatches = []
        var previousSelection
        var currentSelection
        var debounce = _.debounce

        function State() {}

        function addToStack(stack) {
            return function() {
                stack.push(this)
                this.patches = previousPatches
                this.selection = previousSelection
                previousPatches = []
                previousSelection = undefined
            }
        }

        State.prototype.addToUndoStack = addToStack(undoStack)
        State.prototype.addToRedoStack = addToStack(redoStack)

        function StateMgr() {
            var currentTime, lastTime
            var lastMode

            this.isBufferState = function() {
                currentTime = Date.now()
                return this.currentMode !== 'single' &&
                    this.currentMode === lastMode &&
                    currentTime - lastTime < options.bufferStateUntilIdle
            }

            this.setDefaultMode = function(mode) {
                this.currentMode = this.currentMode || mode
            }

            this.resetMode = function() {
                stateMgr.currentMode = undefined
                lastMode = undefined
            }

            this.saveMode = function() {
                lastMode = this.currentMode
                this.currentMode = undefined
                lastTime = currentTime
            }
        }

        var stateMgr = new StateMgr()
        this.setCurrentMode = function(mode) {
            stateMgr.currentMode = mode
        }
        this.setDefaultMode = stateMgr.setDefaultMode.bind(stateMgr)

        var diffMatchPatch = new diff_match_patch()

        this.addPatches = function(patches) {
            currentPatches.push.apply(currentPatches, patches)
            currentSelection = selectionMgr.getLastSelection()
        }

        function saveCurrentPatches() {
            // Move currentPatches into previousPatches
            Array.prototype.push.apply(previousPatches, currentPatches)
            currentPatches = []
        }

        function saveCurrentSelection() {
            currentSelection && (previousSelection = currentSelection)
            currentSelection = undefined
        }

        this.saveState = debounce(function() {
            redoStack.length = 0
            if (!stateMgr.isBufferState()) {
                currentState.addToUndoStack()

                // Limit the size of the stack
                while (undoStack.length > options.undoStackMaxSize) {
                    undoStack.shift()
                }
            }
            saveCurrentPatches()
            saveCurrentSelection()
            currentState = new State()
            stateMgr.saveMode()
            self.$trigger('undoStateChange')
        })

        this.canUndo = function() {
            return !!undoStack.length
        }

        this.canRedo = function() {
            return !!redoStack.length
        }

        function restoreState(patches, selection, isForward) {
            // Update editor
            var content = editor.getContent()
            if (!isForward) {
                patches = diffMatchPatch.patch_deepCopy(patches).reverse()
                _.each(patches, function(patch) {
                    _.each(patch.diffs, function(diff) {
                        diff[0] = -diff[0]
                    })
                })
            }

            var newContent = diffMatchPatch.patch_apply(patches, content)[0]
            var range = editor.setContent(newContent, true)

            var diffs = diffMatchPatch.diff_main(content, newContent)
            _.each(editor.$markers, function(marker) {
                marker.adjustOffset(diffs)
            })

            if (selection) {
                selectionMgr.setSelectionStartEnd(selection.start, selection.end)
            } else {
                selectionMgr.setSelectionStartEnd(range.end, range.end)
            }
            selectionMgr.updateCursorCoordinates(true)

            stateMgr.resetMode()
            self.$trigger('undoStateChange')
            editor.adjustCursorPosition()
        }

        this.undo = function() {
            var state = undoStack.pop()
            if (!state) {
                return
            }
            saveCurrentPatches()
            saveCurrentSelection()
            currentState.addToRedoStack()
            restoreState(currentState.patches, currentState.selection)
            previousPatches = state.patches
            previousSelection = state.selection
            currentState = state
        }

        this.redo = function() {
            var state = redoStack.pop()
            if (!state) {
                return
            }
            currentState.addToUndoStack()
            restoreState(state.patches, currentState.selection, true)
            previousPatches = state.patches
            previousSelection = state.selection
            currentState = state
        }

        this.init = function() {
            selectionMgr = editor.selectionMgr
            if (!currentState) {
                currentState = new State()
            }
        }
    }

    cee.UndoMgr = UndoMgr
})(window.cee, window.diff_match_patch, window._)
