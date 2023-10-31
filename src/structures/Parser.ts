import path from 'path';
import { sendError } from '../utils/sendError';
import { Token, TokenType } from './Token';
import { ASTNode } from './AST';
import keywords from '../utils/keywords';

export class Parser {
    private internalPath = path.resolve(__dirname, '..', 'internal');
    private position = 0;
    private importModules: any[] = [];
    private astNodes: ASTNode[] = [];

    constructor(private tokens: Token[]) { }

    private getNextToken(token: Token) {
        return this.tokens[this.tokens.indexOf(token) + 1];
    }

    private getPreviousToken(token: Token) {
        return this.tokens[this.tokens.indexOf(token) - 1];
    }

    private get isEndOfTokens() {
        return this.position >= this.tokens.length;
    }

    private advance() {
        this.position++;
    }

    private isImport(token: Token) {
        return token.type === TokenType.Identifier && token.value === 'import';
    }

    private async parseImport(token: Token) {
        const nextToken = this.getNextToken(token);

        if (nextToken.type !== TokenType.String) {
            sendError({
                message: `Expected string after "import" keyword, got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        const importName = nextToken.value;
        const importModuleFile = await import(`${this.internalPath}/${importName}/main`).catch(() => null);

        if (!importModuleFile) {
            sendError({
                message: `Could not find module "${importName}"`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        this.importModules.push({ name: importName, exports: importModuleFile });
    }

    private isFunctionDefinition(token: Token) {
        return token.type === TokenType.Identifier && token.value === 'function';
    }

    private parseFunctionDefinition(token: Token) {

        const nextToken = this.getNextToken(token);

        if (nextToken.type !== TokenType.Identifier) {
            sendError({
                message: `Expected identifier after "function" keyword, got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        const nextTokenAfterName = this.getNextToken(nextToken);

        if (nextTokenAfterName.type !== TokenType.LeftParen) {
            sendError({
                message: `Expected "(" after function name, got "${nextTokenAfterName.value}" instead`,
                line: nextTokenAfterName.line,
                column: nextTokenAfterName.column
            });
        }

        const nextTokenAfterLeftParen = this.getNextToken(nextTokenAfterName);

        if (nextTokenAfterLeftParen.type !== TokenType.RightParen) {
            sendError({
                message: `Expected ")" after "(", got "${nextTokenAfterLeftParen.value}" instead`,
                line: nextTokenAfterLeftParen.line,
                column: nextTokenAfterLeftParen.column
            });
        }

        const nextTokenAfterRightParen = this.getNextToken(nextTokenAfterLeftParen);

        if (nextTokenAfterRightParen.type !== TokenType.LeftCurly) {
            sendError({
                message: `Expected "{" after ")", got "${nextTokenAfterRightParen.value}" instead`,
                line: nextTokenAfterRightParen.line,
                column: nextTokenAfterRightParen.column
            });
        }

        let indexOfFunctionBodyStart = this.tokens.indexOf(nextTokenAfterRightParen) + 1;
        const functionBodyTokens: Token[] = [];

        const isrightCurly = (token: Token) => token.type === TokenType.RightCurly;

        while (!isrightCurly(this.tokens[indexOfFunctionBodyStart])) {
            functionBodyTokens.push(this.tokens[indexOfFunctionBodyStart]);
            indexOfFunctionBodyStart++;
        }

        //this.position = indexOfFunctionBodyStart;

        this.astNodes.push({
            isFunctionDeclaration: true,
            column: nextToken.column,
            line: nextToken.line,
            functionDeclarationValue: {
                name: nextToken.value,
                body: functionBodyTokens
            }
        });

    }

    private isFunctionCall(token: Token) {
        const nextToken = this.getNextToken(token);

        return (token.type === TokenType.Identifier && nextToken.type === TokenType.LeftParen)
      && this.getPreviousToken(token).value !== keywords.functionDeclaration;
    }

    private parseFunctionCall(token: Token) {
        let nextToken = this.getNextToken(this.getNextToken(token));
        const parameters: Token[] = [];

        while (nextToken.type !== TokenType.RightParen) {
            switch (nextToken.type) {
            case TokenType.String:
            case TokenType.Identifier:
                parameters.push(nextToken);
                nextToken = this.getNextToken(nextToken);
                break;

            default:
                sendError({
                    message: `Expected a valid argument after "(", got "${nextToken.value}" instead`,
                    line: nextToken.line,
                    column: nextToken.column
                });
            }
        }

        if (nextToken.type !== TokenType.RightParen) {
            sendError({
                message: `Expected ")" after "(", got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        this.astNodes.push({
            isFunctionCall: true,
            column: token.column,
            line: token.line,
            functionCallValue: {
                name: token.value,
                args: parameters
            }
        });
    }

    private isModuleFunctionCall(token: Token) {
        const nextToken = this.getNextToken(token);
        const previousToken = this.getPreviousToken(token);
        const previousTokenBeforeDot = this.getPreviousToken(previousToken);

        return (token.type === TokenType.Identifier && nextToken.type === TokenType.LeftParen)
      && (previousToken.type === TokenType.Dot && previousTokenBeforeDot.type === TokenType.Identifier);
    }

    private isModuleAccessField(token: Token) {
        const nextToken = this.getNextToken(token);
        return token.type === TokenType.Identifier && nextToken.type === TokenType.Dot;
    }

    private async parseModuleAccessField(token: Token) {
        const nextToken = this.getNextToken(token);
        const nextTokenAfterDot = this.getNextToken(nextToken);

        const importName = token.value;
        const importModuleFile = await import(`${this.internalPath}/${importName}/main`).catch(() => null);

        if (!importModuleFile) {
            sendError({
                message: `Could not find module "${importName}"`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        if (nextTokenAfterDot.type !== TokenType.Identifier) {
            sendError({
                message: `Expected identifier after ".", got "${nextTokenAfterDot.value}" instead`,
                line: nextTokenAfterDot.line,
                column: nextTokenAfterDot.column
            });
        }

        if (this.isModuleFunctionCall(nextTokenAfterDot)) {
            this.parseFunctionCall(nextTokenAfterDot);

            this.astNodes.push({
                isModuleAccessField: true,
                isFunctionCall: true,
                column: token.column,
                line: token.line,
                moduleAccessFieldValue: {
                    name: token.value,
                    field: nextTokenAfterDot.value,
                    isFunctionCall: this.isModuleFunctionCall(nextTokenAfterDot)
                }
            });
        }
        else {
            this.astNodes.push({
                isModuleAccessField: true,
                isFunctionCall: false,
                column: token.column,
                line: token.line,
                moduleAccessFieldValue: {
                    name: token.value,
                    field: nextTokenAfterDot.value,
                    isFunctionCall: this.isModuleFunctionCall(nextTokenAfterDot)
                }
            });
        }

    }

    private isVariableDeclaration(token: Token) {
        const nextToken = this.getNextToken(token);
        return token.type === TokenType.Identifier && token.value === keywords.variableDeclaration && nextToken.type === TokenType.Identifier;
    }

    private parseVariableDeclaration(token: Token) {
        const nameToken = this.getNextToken(token);
        const nextTokenAfterName = this.getNextToken(nameToken);

        if (nextTokenAfterName.type !== TokenType.Equals) {
            sendError({
                message: `Expected "=" after variable name, got "${nextTokenAfterName.value}" instead`,
                line: nextTokenAfterName.line,
                column: nextTokenAfterName.column,
            });
        }

        const nextTokenAfterEquals = this.getNextToken(nextTokenAfterName);

        if ([TokenType.Identifier, TokenType.String].indexOf(nextTokenAfterEquals.type) === -1) {
            sendError({
                message: `Expected a valid value after "=", got "${nextTokenAfterEquals.value}" instead`,
                line: nextTokenAfterEquals.line,
                column: nextTokenAfterEquals.column,
            });
        }

        this.astNodes.push({
            isVariableDeclaration: true,
            column: token.column,
            line: token.line,
            variableDeclarationValue: {
                name: nameToken.value,
                value: nextTokenAfterEquals.value,
                type: nextTokenAfterEquals.type
            }
        });

    }

    public async parse() {
        while (!this.isEndOfTokens) {
            const currentToken = this.tokens[this.position];

            if (this.isImport(currentToken)) {
                await this.parseImport(currentToken);
            }

            else if (this.isFunctionDefinition(currentToken)) {
                this.parseFunctionDefinition(currentToken);
            }

            else if (this.isFunctionCall(currentToken) && !this.isModuleFunctionCall) {
                this.parseFunctionCall(currentToken);
            }

            else if (this.isModuleAccessField(currentToken)) {
                await this.parseModuleAccessField(currentToken);
            }

            else if (this.isVariableDeclaration(currentToken)) {
                this.parseVariableDeclaration(currentToken);
            }

            this.advance();
        }

        return {
            astNodes: this.astNodes,
            importModules: this.importModules
        };

    }

}
