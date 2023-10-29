import { sendError } from "../utils/sendError";
import { Token, TokenType } from "./Token";

export class Lexer {
  private readonly tokens: Token[] = [];
  private position = 0;
  private line = 1;
  private column = 0;

  constructor(private readonly text: string) { }

  private get currentChar(): string {
    return this.text[this.position];
  }

  private get isEOF(): boolean {
    return this.position >= this.text.length;
  }

  private advance(): void {
    this.position++;
    this.column++;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
    });
  }

  private isIdentifierChar(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private isStringChar(char: string): boolean {
    return /[^"]/.test(char);
  }

  private isWhitespace(char: string): boolean {
    return / /.test(char);
  }

  private isNewLine(char: string): boolean {
    return /\n/.test(char);
  }

  private isDot(char: string): boolean {
    return /\./.test(char);
  }

  private skipWhitespace(): void {
    while (this.isWhitespace(this.currentChar)) {
      this.advance();
    }
  }

  private lexIdentifier(): void {
    let value = '';

    while (this.isIdentifierChar(this.currentChar)) {
      value += this.currentChar;
      this.advance();
    }

    this.addToken(TokenType.Identifier, value);
  }

  private lexString(): void {
    let value = '';

    this.advance();

    while (this.isStringChar(this.currentChar)) {
      value += this.currentChar;
      this.advance();
    }

    this.advance();

    this.addToken(TokenType.String, value);
  }

  private lexLeftParen(): void {
    this.advance();
    this.addToken(TokenType.LeftParen, '(');
  }

  private lexRightParen(): void {
    this.advance();
    this.addToken(TokenType.RightParen, ')');
  }

  private lexLeftCurly(): void {
    this.advance();
    this.addToken(TokenType.LeftCurly, '{');
  }

  private lexRightCurly(): void {
    this.advance();
    this.addToken(TokenType.RightCurly, '}');
  }

  public lex(): Token[] {
    while (!this.isEOF) {
      if (this.isWhitespace(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (this.isNewLine(this.currentChar)) {
        this.line++;
        this.column = 0;
        this.advance();
        continue;
      }

      if (this.isIdentifierChar(this.currentChar)) {
        this.lexIdentifier();
        continue;
      }

      if (this.currentChar === '"' || this.currentChar === "'") {
        this.lexString();
        continue;
      }

      if (this.isDot(this.currentChar)) {
        this.addToken(TokenType.Dot, '.');
        this.advance();
        continue;
      }

      if (this.currentChar === '(') {
        this.lexLeftParen();
        continue;
      }

      if (this.currentChar === ')') {
        this.lexRightParen();
        continue;
      }

      if (this.currentChar === '{') {
        this.lexLeftCurly();
        continue;
      }

      if (this.currentChar === '}') {
        this.lexRightCurly();
        continue;
      }

      sendError({
        message: `Unexpected token "${this.currentChar}"`,
        line: this.line,
        column: this.column
      })
    }

    return this.tokens;
  }
}
