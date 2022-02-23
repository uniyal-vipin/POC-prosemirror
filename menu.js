import {
  wrapItem,
  blockTypeItem,
  Dropdown,
  icons,
  MenuItem,
} from 'prosemirror-menu';
import { toggleMark } from 'prosemirror-commands';
import { wrapInList } from 'prosemirror-schema-list';
import { TextField, openPrompt } from './prompt';


function canInsert(state, nodeType) {
  let $from = state.selection.$from;
  for (let d = $from.depth; d >= 0; d--) {
    let index = $from.index(d);
    if ($from.node(d).canReplaceWith(index, index, nodeType)) return true;
  }
  return false;
}


function cmdItem(cmd, options) {
  let passedOptions = {
    label: options.title,
    run: cmd,
  };
  for (let prop in options) passedOptions[prop] = options[prop];
  if ((!options.enable || options.enable === true) && !options.select)
    passedOptions[options.enable ? 'enable' : 'select'] = (state) => cmd(state);

  return new MenuItem(passedOptions);
}

function markActive(state, type) {
  let { from, $from, to, empty } = state.selection;
  if (empty) return type.isInSet(state.storedMarks || $from.marks());
  else return state.doc.rangeHasMark(from, to, type);
}

function markItem(markType, options) {
  let passedOptions = {
    active(state) {
      return markActive(state, markType);
    },
    enable: true,
  };
  for (let prop in options) passedOptions[prop] = options[prop];
  return cmdItem(toggleMark(markType), passedOptions);
}

function linkItem(markType) {
  return new MenuItem({
    title: 'Add or remove link',
    icon: icons.link,
    active(state) {
      return markActive(state, markType);
    },
    enable(state) {
      return !state.selection.empty;
    },
    run(state, dispatch, view) {
      if (markActive(state, markType)) {
        toggleMark(markType)(state, dispatch);
        return true;
      }
      openPrompt({
        title: 'Create a link',
        fields: {
          href: new TextField({
            label: 'Link target',
            required: true,
          }),
          title: new TextField({ label: 'Title' }),
        },
        callback(attrs) {
          toggleMark(markType, attrs)(view.state, view.dispatch);
          view.focus();
        },
      });
    },
  });
}

function wrapListItem(nodeType, options) {
  return cmdItem(wrapInList(nodeType, options.attrs), options);
}

export function buildMenuItems(schema) {
  let r = {},
    type;
  if ((type = schema.marks.strong))
    r.toggleStrong = markItem(type, {
      title: 'Toggle strong style',
      icon: icons.strong,
    });
  if ((type = schema.marks.em))
    r.toggleEm = markItem(type, { title: 'Toggle emphasis', icon: icons.em });
  if ((type = schema.marks.code))
    r.toggleCode = markItem(type, {
      title: 'Toggle code font',
      icon: icons.code,
    });
  if ((type = schema.marks.link)) r.toggleLink = linkItem(type);

  if ((type = schema.nodes.bullet_list))
    r.wrapBulletList = wrapListItem(type, {
      title: 'Wrap in bullet list',
      icon: icons.bulletList,
    });
  if ((type = schema.nodes.ordered_list))
    r.wrapOrderedList = wrapListItem(type, {
      title: 'Wrap in ordered list',
      icon: icons.orderedList,
    });
  if ((type = schema.nodes.blockquote))
    r.wrapBlockQuote = wrapItem(type, {
      title: 'Wrap in block quote',
      icon: icons.blockquote,
    });
  if ((type = schema.nodes.paragraph))
    r.makeParagraph = blockTypeItem(type, {
      title: 'Change to paragraph',
      label: 'Plain',
    });
  if ((type = schema.nodes.code_block))
    r.makeCodeBlock = blockTypeItem(type, {
      title: 'Change to code block',
      label: 'Code',
    });
  if ((type = schema.nodes.heading))
    for (let i = 1; i <= 10; i++)
      r['makeHead' + i] = blockTypeItem(type, {
        title: 'Change to heading ' + i,
        label: 'Level ' + i,
        attrs: { level: i },
      });
  if ((type = schema.nodes.horizontal_rule)) {
    let hr = type;
    r.insertHorizontalRule = new MenuItem({
      title: 'Insert horizontal rule',
      label: 'Horizontal rule',
      enable(state) {
        return canInsert(state, hr);
      },
      run(state, dispatch) {
        dispatch(state.tr.replaceSelectionWith(hr.create()));
      },
    });
  }

  let cut = (arr) => arr.filter((x) => x);
  r.insertMenu = new Dropdown(cut([r.insertImage, r.insertHorizontalRule]), {
    label: 'Contact Fields',
  });

  r.inlineMenu = [
    cut([r.toggleStrong, r.toggleEm, r.toggleCode, r.toggleLink]),
  ];
  r.fullMenu = r.inlineMenu.concat([[r.insertMenu]]);

  return r;
}
