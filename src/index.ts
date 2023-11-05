import * as fs from 'node:fs/promises';
import { Lexer } from './structures/Lexer';
import { Parser } from './structures/Parser';
import { Visitor } from './structures/Visitor';
import { sendError } from './utils/sendError';

async function main() {
  const filePath = process.argv[2]

  if (!filePath || process.argv.length < 3) {
    sendError({
      message: 'No file specified',
      line: 0,
      column: 0,
    })
  }

  const text = await fs.readFile(filePath, 'utf-8').catch(() => null);

  if (!text) {
    sendError({
      message: `File ${filePath} not found`,
      line: 0,
      column: 0,
    })
  }

  const lexer = new Lexer(text!);
  const parser = new Parser(lexer.lex(), filePath);

  const { astNodes, importModules } = await parser.parse()

  const visitor = new Visitor(astNodes, importModules);
  visitor.visit();

}

main();
