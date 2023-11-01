export enum TokenType {
  Identifier,
  String,
  LeftParen,
  RightParen,
  LeftCurly,
  RightCurly,
  Dot,
  Equals
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

