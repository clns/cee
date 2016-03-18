'use strict'

// import diff_match_patch from 'googlediff'
import _ from 'lodash';
import { add } from 'lodash/fp';

// let add1 = add(1);
// _.map([1, 2, 3], add1);

import editor from './lib/core'

window.editor = editor;

console.log(editor);
