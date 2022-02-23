import { Schema } from 'prosemirror-model'

const brDOM = ['br']

const calcYchangeDomAttrs = (attrs, domAttrs = {}) => {
  domAttrs = Object.assign({}, domAttrs)
  if (attrs.ychange !== null) {
    domAttrs.ychange_user = attrs.ychange.user
    domAttrs.ychange_state = attrs.ychange.state
  }
  return domAttrs
}

export const nodes = {
  doc: {
    content: 'block+'
  },

  paragraph: {
    attrs: { ychange: { default: null } },
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM (node) { return ['p', calcYchangeDomAttrs(node.attrs), 0] }
  },

  text: {
    group: 'inline'
  },

  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM () { return brDOM }
  }
}

const emDOM = ['em', 0]; const strongDOM = ['strong', 0]; 

export const marks = {
  link: {
    attrs: {
      href: {},
      title: { default: null }
    },
    inclusive: false,
    parseDOM: [{
      tag: 'a[href]',
      getAttrs (dom) {
        return { href: dom.getAttribute('href'), title: dom.getAttribute('title') }
      }
    }],
    toDOM (node) { return ['a', node.attrs, 0] }
  },

  em: {
    parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
    toDOM () { return emDOM }
  },

  strong: {
    parseDOM: [{ tag: 'strong' },
      { tag: 'b', getAttrs: node => node.style.fontWeight !== 'normal' && null },
      { style: 'font-weight', getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }],
    toDOM () { return strongDOM }
  },

  ychange: {
    attrs: {
      user: { default: null },
      state: { default: null }
    },
    inclusive: false,
    parseDOM: [{ tag: 'ychange' }],
    toDOM (node) {
      return ['ychange', { ychange_user: node.attrs.user, ychange_state: node.attrs.state }, 0]
    }
  }
}
export const schema = new Schema({ nodes, marks })
