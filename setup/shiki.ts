import { defineShikiSetup } from '@slidev/types'

// FunnyLambda: the bespoke dialect in this deck. Minimal TextMate grammar.
const funnylambda = {
  displayName: 'FunnyLambda',
  name: 'funnylambda',
  aliases: ['fl'],
  scopeName: 'source.funnylambda',
  patterns: [
    { include: '#comment' },
    { include: '#string' },
    { include: '#keyword' },
    { include: '#constructor' },
    { include: '#typename' },
    { include: '#ident' },
    { include: '#number' },
  ],
  repository: {
    comment: {
      name: 'comment.line.double-slash.funnylambda',
      match: '//.*',
    },
    string: {
      name: 'string.quoted.double.funnylambda',
      begin: '"',
      end: '"',
    },
    keyword: {
      name: 'keyword.control.funnylambda',
      match: '\\b(data|match|let|in)\\b',
    },
    constructor: {
      name: 'variable.other.constant.funnylambda',
      match: '\\.[^\\s(),{}\\[\\]]+',
    },
    typename: {
      name: 'entity.name.type.funnylambda',
      match: '\\b[A-Z][a-zA-Z0-9_]*\\b',
    },
    ident: {
      name: 'variable.other.funnylambda',
      match: '\\b[a-z][a-zA-Z0-9_]*\\b',
    },
    number: {
      name: 'constant.numeric.funnylambda',
      match: '\\b\\d+(\\.\\d+)?\\b',
    },
  },
}

export default defineShikiSetup(() => ({
  themes: {
    light: 'github-light-default',
    dark: 'github-light-default',
  },
  langs: ['typescript', 'javascript', 'rust', 'kotlin', 'haskell', 'bash', 'md', funnylambda as any],
}))
