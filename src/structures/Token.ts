export enum TokenType {
  Identifier,
  String,
  LeftParen,
  RightParen,
  LeftCurly,
  RightCurly,
  Dot
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

