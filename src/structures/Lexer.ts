import keywords from '../utils/keywords';
import { sendError } from '../utils/sendError';
import { Token, TokenType } from './Token';

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

    private isEquals(char: string): boolean {
        return char === '=';
    }

    private isStringChar(char: string): boolean {
        return char === '"' || char === '\'';
    }

    private isWhitespace(char: string): boolean {
        return char === ' ' || char === '\t';
    }

    private isNewLine(char: string): boolean {
        return char === '\n';
    }

    private isNumberChar(char: string): boolean {
        return /[0-9]/.test(char);
    }

    private isDot(char: string): boolean {
        return char === '.';
    }

    private isComma(char: string): boolean {
        return char === ',';
    }

    private isColon(char: string): boolean {
        return char === ':';
    }

    private isPercent(char: string): boolean {
        return char === '%';
    }

    private isComment(char: string): boolean {
        return char === '/';
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

        if (this.isNumberChar(value[0]) && isNaN(Number(value))) {
            sendError({
                message: 'Invalid identifier',
                line: this.line,
                column: this.column
            });

            return;
        }

        if (!isNaN(Number(value))) {
            this.addToken(TokenType.Number, value);
            return;
        }

        if (keywords.boolean.includes(value)) {
            this.addToken(TokenType.Boolean, value);
            return;
        }

        this.addToken(TokenType.Identifier, value);
    }

    private lexEquals(): void {
        this.advance();
        this.addToken(TokenType.Equals, '=');
    }

    private lexColon(): void {
        this.advance();
        this.addToken(TokenType.Colon, ':');
    }

    private lexString(): void {
        let value = '';

        const stringChar = this.currentChar;
        this.advance();

        while (this.currentChar !== stringChar && !this.isEOF) {
            value += this.currentChar;
            this.advance();
        }

        if (this.currentChar !== stringChar) {
            sendError({
                message: 'Unterminated string',
                line: this.line,
                column: this.column
            });
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

    private lexComma(): void {
        this.advance();
        this.addToken(TokenType.Comma, ',');
    }

    private lexPercent(): void {
        this.advance();
        this.addToken(TokenType.Percent, '%');
    }

    private lexComment() {
        while (!this.isNewLine(this.currentChar)) {
            this.advance();
        }
    }

    public lex(): Token[] {
        while (!this.isEOF) {
            if (this.isWhitespace(this.currentChar)) {
                this.skipWhitespace();
                continue;
            }

            if (this.isComment(this.currentChar)) {
                this.lexComment();
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

            if (this.isStringChar(this.currentChar)) {
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

            if (this.isEquals(this.currentChar)) {
                this.lexEquals();
                continue;
            }

            if (this.isComma(this.currentChar)) {
                this.lexComma();
                continue;
            }

            if (this.isColon(this.currentChar)) {
                this.lexColon();
                continue;
            }

            if (this.isPercent(this.currentChar)) {
                this.lexPercent();
                continue;
            }

            sendError({
                message: `Unexpected token "${this.currentChar}"`,
                line: this.line,
                column: this.column
            });
        }

        return this.tokens;
    }
}
