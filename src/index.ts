import * as fs from 'node:fs'
import { Lexer } from './structures/Lexer';
import { Parser } from './structures/Parser';
import { Visitor } from './structures/Visitor';

const text = fs.readFileSync('./examples/main.mrk', 'utf-8');

const lexer = new Lexer(text)
const parser = new Parser(lexer.lex())

parser.parse().then(({ astNodes, importModules }) => {
  const visitor = new Visitor(astNodes, importModules)
  visitor.visit()
})
