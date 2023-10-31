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

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

