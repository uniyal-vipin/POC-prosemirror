// import { defaultMarkdownSerializer } from './domToMarkdown';
import { customMarkdownParser } from './markdownToDom';
import { contactFieldSchema, fields } from './contactFieldSchema';

const { DOMParser } = require('prosemirror-model');

let content = document.querySelector('#content');

let startDoc = DOMParser.fromSchema(contactFieldSchema).parse(content);

let fieldType = contactFieldSchema.nodes.contact_field;

function insertfield(type) {
  return function (state, dispatch) {
    let { $from } = state.selection,
      index = $from.index();
    if (!$from.parent.canReplaceWith(index, index, fieldType)) return false;
    if (dispatch)
      dispatch(state.tr.replaceSelectionWith(fieldType.create({ type })));
    return true;
  };
}

const { MenuItem } = require('prosemirror-menu');
import { buildMenuItems } from './menu';

let menu = buildMenuItems(contactFieldSchema);

fields.forEach((name) =>
  menu.insertMenu.content.push(
    new MenuItem({
      title: 'Insert',
      label: name.charAt(0).toUpperCase() + name.slice(1),
      enable(state) {
        return insertfield(name)(state);
      },
      run: insertfield(name),
    })
  )
);

const { EditorState } = require('prosemirror-state');
const { EditorView } = require('prosemirror-view');
const { exampleSetup } = require('prosemirror-example-setup');

window.view = new EditorView(document.querySelector('#editor'), {
  state: EditorState.create({
    doc: customMarkdownParser.parse('**nn** {{def}}'),
    plugins: exampleSetup({
      schema: contactFieldSchema,
      menuContent: menu.fullMenu,
    }),
  }),
});

// setInterval(
//   () =>
//     console.log(
//       defaultMarkdownSerializer.serialize(
//         DOMParser.fromSchema(contactFieldSchema).parse(view.dom)
//       )
//     ),
//   5000
// );
