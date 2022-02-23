import { Schema } from 'prosemirror-model'
import { schema } from './schema';

export const fields = [
  'field_1',
  'field_2',
  'field_3',
  'field_3',
  'field_4',
  'field_5',
  'field_5',
];

const fieldNodeSpec = {
  attrs: {
    type: { default: '' },
    value: { default: {} },
    id: { default: '' },
  },
  content: 'block+',
  inline: true,
  group: 'inline',
  draggable: true,
  toDOM: (node) => {
    const block = document.createElement('contact_field');
    const textToAdd = document.createTextNode(node.attrs.type);
    block.appendChild(textToAdd);

    block.classList.add('variable-block');
    return block;
  },
  parseDOM: [
    {
      tag: 'contact_field',
      getAttrs: (dom) => {
        let type = dom.getAttribute('field-type');
        return fields.indexOf(type) > -1 ? { type } : false;
      },
    },
  ],
};

export const contactFieldSchema = new Schema({
  nodes: schema.spec.nodes.addBefore('img', 'contact_field', fieldNodeSpec),
  marks: schema.spec.marks,
});