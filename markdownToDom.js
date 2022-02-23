import MarkdownIt from 'markdown-it';
import { Mark } from 'prosemirror-model';
import { contactFieldSchema } from './contactFieldSchema';
import { contactFieldPlugin } from './contactFieldPlugin';

function maybeMerge(a, b) {
  if (a.isText && b.isText && Mark.sameSet(a.marks, b.marks))
    return a.withText(a.text + b.text);
}

// Object used to track the context of a running parse.
class MarkdownParseState {
  constructor(schema, tokenHandlers) {
    this.schema = schema;
    this.stack = [{ type: schema.topNodeType, content: [] }];
    this.marks = Mark.none;
    this.tokenHandlers = tokenHandlers;
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  push(elt) {
    if (this.stack.length) this.top().content.push(elt);
  }

  // : (string)
  // Adds the given text to the current position in the document,
  // using the current marks as styling.
  addText(text) {
    if (!text) return;
    let nodes = this.top().content,
      last = nodes[nodes.length - 1];
    let node = this.schema.text(text, this.marks),
      merged;
    if (last && (merged = maybeMerge(last, node)))
      nodes[nodes.length - 1] = merged;
    else nodes.push(node);
  }

  // : (Mark)
  // Adds the given mark to the set of active marks.
  openMark(mark) {
    this.marks = mark.addToSet(this.marks);
  }

  // : (Mark)
  // Removes the given mark from the set of active marks.
  closeMark(mark) {
    this.marks = mark.removeFromSet(this.marks);
  }

  parseTokens(toks) {
    for (let i = 0; i < toks.length; i++) {
      let tok = toks[i];
      let handler = this.tokenHandlers[tok.type];
      if (!handler)
        throw new Error(
          'Token type `' + tok.type + '` not supported by Markdown parser'
        );
      handler(this, tok, toks, i);
    }
  }

  // : (NodeType, ?Object, ?[Node]) → ?Node
  // Add a node at the current position.
  addNode(type, attrs, content) {
    let node = type.createAndFill(attrs, content, this.marks);
    if (!node) return null;
    this.push(node);
    return node;
  }

  // : (NodeType, ?Object)
  // Wrap subsequent content in a node of the given type.
  openNode(type, attrs) {
    this.stack.push({ type: type, attrs: attrs, content: [] });
  }

  // : () → ?Node
  // Close and return the node that is currently on top of the stack.
  closeNode() {
    if (this.marks.length) this.marks = Mark.none;
    let info = this.stack.pop();
    return this.addNode(info.type, info.attrs, info.content);
  }
}

function attrs(spec, token, tokens, i) {
  if (spec.getAttrs) return spec.getAttrs(token, tokens, i);
  // For backwards compatibility when `attrs` is a Function
  else if (spec.attrs instanceof Function) return spec.attrs(token);
  else return spec.attrs;
}

// Code content is represented as a single token with a `content`
// property in Markdown-it.
function noCloseToken(spec, type) {
  return (
    spec.noCloseToken ||
    type == 'code_inline' ||
    type == 'code_block' ||
    type == 'fence'
  );
}

function withoutTrailingNewline(str) {
  return str[str.length - 1] == '\n' ? str.slice(0, str.length - 1) : str;
}

function noOp() {}

function tokenHandlers(schema, tokens) {
  let handlers = Object.create(null);
  for (let type in tokens) {
    let spec = tokens[type];
    if (spec.block) {
      let nodeType = schema.nodeType(spec.block);
      if (noCloseToken(spec, type)) {
        handlers[type] = (state, tok, tokens, i) => {
          state.openNode(nodeType, attrs(spec, tok, tokens, i));
          state.addText(withoutTrailingNewline(tok.content));
          state.closeNode();
        };
      } else {
        handlers[type + '_open'] = (state, tok, tokens, i) =>
          state.openNode(nodeType, attrs(spec, tok, tokens, i));
        handlers[type + '_close'] = (state) => state.closeNode();
      }
    } else if (spec.node) {
      let nodeType = schema.nodeType(spec.node);
      handlers[type + '_open'] = (state, tok, tokens, i) =>
        state.openNode(nodeType, attrs(spec, tok, tokens, i));
      handlers[type + '_close'] = (state) => state.closeNode();
    } else if (spec.mark) {
      let markType = schema.marks[spec.mark];
      if (noCloseToken(spec, type)) {
        handlers[type] = (state, tok, tokens, i) => {
          state.openMark(markType.create(attrs(spec, tok, tokens, i)));
          state.addText(withoutTrailingNewline(tok.content));
          state.closeMark(markType);
        };
      } else {
        handlers[type + '_open'] = (state, tok, tokens, i) =>
          state.openMark(markType.create(attrs(spec, tok, tokens, i)));
        handlers[type + '_close'] = (state) => state.closeMark(markType);
      }
    } else if (spec.ignore) {
      if (noCloseToken(spec, type)) {
        handlers[type] = noOp;
      } else {
        handlers[type + '_open'] = noOp;
        handlers[type + '_close'] = noOp;
      }
    } else {
      throw new RangeError('Unrecognized parsing spec ' + JSON.stringify(spec));
    }
  }
  handlers.text = (state, tok) => state.addText(tok.content);
  handlers.inline = (state, tok) => state.parseTokens(tok.children);
  handlers.softbreak = handlers.softbreak || ((state) => state.addText('\n'));
  return handlers;
}

export class MarkdownParser {
  constructor(schema, tokenizer, tokens) {
    this.tokens = tokens;
    this.schema = schema;
    this.tokenizer = tokenizer;
    this.tokenHandlers = tokenHandlers(schema, tokens);
  }

  parse(text) {
    let state = new MarkdownParseState(this.schema, this.tokenHandlers),
      doc;
    state.parseTokens(this.tokenizer.parse(text, {}));
    do {
      doc = state.closeNode();
    } while (state.stack.length);
    return doc || this.schema.topNodeType.createAndFill();
  }
}

const md = new MarkdownIt('commonmark', { html: false }).use(
  contactFieldPlugin
);

const tokens = {
  paragraph: { block: 'paragraph' },
  hardbreak: { node: 'hard_break' },
  contact_field: {
    node: 'contact_field',
    noCloseToken: false,
  },
  em: { mark: 'em' },
  strong: { mark: 'strong' },
  link: {
    mark: 'link',
    getAttrs: (tok) => ({
      href: tok.attrGet('href'),
      title: tok.attrGet('title') || null,
    }),
  },
};

export const customMarkdownParser = new MarkdownParser(contactFieldSchema, md, tokens);
