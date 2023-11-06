export enum TokenType {
  Identifier = 'Identifier',
  String = 'String',
  LeftParen = 'LeftParen',
  RightParen = 'RightParen',
  LeftCurly = 'LeftCurly',
  RightCurly = 'RightCurly',
  Dot = 'Dot',
  Equals = 'Equals',
  Boolean = 'Boolean',
  Number = 'Number',
  Comma = 'Comma',
}

export type LocalScope = {
  name: string;
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  localScope?: LocalScope;
}

