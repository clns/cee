;(function(diff_match_patch, _) {
    "use strict"

    function cee(contentElt, scrollElt, windowParam) {
        scrollElt = scrollElt || contentElt
        var editor = {
            $contentElt: contentElt,
            $scrollElt: scrollElt,
            $window: windowParam || window,
            $keystrokes: [],
            $markers: {}
        }
        editor.$document = editor.$window.document
        cee.Utils.createEventHooks(editor)

        function toggleEditable(isEditable) {
            if (isEditable === undefined) {
                isEditable = !contentElt.contentEditable
            }
            contentElt.contentEditable = isEditable
        }
        toggleEditable(true)

        function getTextContent() {
            // var textContent = contentElt.textContent.replace(/\r\n?/g, '\n') // Mac/DOS to Unix
            var textContent = contentElt.textContent
            if (textContent.slice(-1) !== '\n') {
                textContent += '\n'
            }
            return textContent
        }

        var lastTextContent = getTextContent()
        var highlighter = new cee.Highlighter(editor)

        var sectionList

        function parseSections(content, isInit) {
            sectionList = highlighter.parseSections(content, isInit)
            editor.$allElements = Array.prototype.slice.call(contentElt.querySelectorAll('.cee-section *'))
            editor.$trigger('contentChanged', content, sectionList)
        }

        // Used to detect editor changes
        var watcher = new cee.Watcher(editor, checkContentChange)
        watcher.startWatching()

        function checkContentChange(mutations) {
            console.log('checkContentChange', arguments)
        }

        function init(options) {
            options = _.extend({
                cursorFocusRatio: 0.5,
                highlighter: function(text) {
                    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ')
                },
                sectionDelimiter: ''
            }, options || {})
            editor.options = options

            if (options.content !== undefined) {
                lastTextContent = options.content.toString()
                if (lastTextContent.slice(-1) !== '\n') {
                    lastTextContent += '\n'
                }
            }

            parseSections(lastTextContent, true)
            // if (options.selectionStart !== undefined && options.selectionEnd !== undefined) {
            //     editor.setSelection(options.selectionStart, options.selectionEnd)
            // } else {
            //     selectionMgr.saveSelectionState()
            // }
            // undoMgr.init()

            if (options.scrollTop !== undefined) {
                scrollElt.scrollTop = options.scrollTop
            }
        }


        // API
        editor.init = init
        editor.toggleEditable = toggleEditable
        editor.getContent = getTextContent
        editor.watcher = watcher


        return editor
    }

    cee._ = _
    window.cee = cee
})(window.diff_match_patch, window._)
