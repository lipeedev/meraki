import path from 'path';
import { sendError } from '../utils/sendError';
import { Token, TokenType } from './Token';
import { ASTNode, ModuleAccessFieldValue } from './AST';
import keywords from '../utils/keywords';
import { readFile } from 'fs/promises';

export class Parser {
    private internalPath = path.resolve(__dirname, '..', 'internal');
    private position = 0;
    private importModules: any[] = [];
    private astNodes: ASTNode[] = [];
    private filePath?: string;

    constructor(private tokens: Token[], filePath?: string) {
        if (filePath) {
            this.filePath = path.dirname(path.resolve(filePath));
        }
    }

    private getNextToken(token: Token) {
        return this.tokens[this.tokens.indexOf(token) + 1] ?? this.tokens[this.tokens.indexOf(token)];
    }

    private getPreviousToken(token: Token) {
        return this.tokens[this.tokens.indexOf(token) - 1] ?? this.tokens[this.tokens.indexOf(token)];
    }

    private get isEndOfTokens() {
        return this.position >= this.tokens.length;
    }

    private advance() {
        this.position++;
    }

    private isValidType(token: Token) {
        return [TokenType.String, TokenType.Number, TokenType.Boolean, TokenType.Identifier].includes(token.type);
    }

    private isImport(token: Token) {
        return token.type === TokenType.Identifier && token.value === keywords.importDeclaration;
    }

    private async parseImport(token: Token) {
        const nextToken = this.getNextToken(token);
        const previousToken = this.getPreviousToken(token);

        if (nextToken.type !== TokenType.String) {
            sendError({
                message: `Expected string after "${keywords.importDeclaration}" keyword, got "${nextToken.value}" instead`,

                line: nextToken.line,
                column: nextToken.column
            });
        }

        let importName = nextToken.value;

        if (importName.endsWith('.mrk')) {
            importName = path.resolve(this.filePath!, importName);
        }

        const importModuleFile = await import(`${this.internalPath}/${importName}/main`).catch(() => null);
        const customImportFile = await readFile(importName).catch(() => null);

        if (!importModuleFile && !customImportFile) {
            sendError({
                message: `Could not find module "${importName}"`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        if (customImportFile) {
            const isExportAllowed = previousToken.value === keywords.exportDeclaration;

            return this.astNodes.push({
                isExportAllowed,
                isCustomImport: true,
                column: token.column,
                line: token.line,
                customImportValue: {
                    path: importName,
                    file: customImportFile.toString()
                }
            });
        }

        this.importModules.push({ name: importName, exports: importModuleFile });
    }

    private isFunctionReturn(token: Token) {
        return token.type === TokenType.Identifier && token.value === keywords.functionReturn;
    }

    private parseFunctionReturn(token: Token) {
        if (!token.localScope) {
            sendError({
                message: 'You can\'t return outside a function',
                line: token.line,
                column: token.column
            });
        }

        const nextToken = this.getNextToken(token);

        if (!this.isValidType(nextToken)) {
            sendError({
                message: `Expected a valid value after "${keywords.functionReturn}", got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        this.astNodes.push({
            isFunctionReturn: true,
            column: token.column,
            line: token.line,
            localScope: token.localScope,
            functionReturnValue: {
                value: nextToken.value,
                type: nextToken.type
            }
        });

    }

    private isFunctionDefinition(token: Token) {
        return token.type === TokenType.Identifier && token.value === keywords.functionDeclaration;
    }

    private parseFunctionDefinition(token: Token) {

        const nextToken = this.getNextToken(token);
        const previousToken = this.getPreviousToken(token);

        if (nextToken.type !== TokenType.Identifier) {
            sendError({
                message: `Expected identifier after "${keywords.functionDeclaration}" keyword, got "${nextToken.value}" instead`,
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

        let currentTokenInsideParen = this.getNextToken(nextTokenAfterName);

        const parameters: Token[] = [];

        while (currentTokenInsideParen.type !== TokenType.RightParen) {
            const previousTokenFromCurrent = this.getPreviousToken(currentTokenInsideParen);

            if (currentTokenInsideParen.type === TokenType.Comma) {

                if (previousTokenFromCurrent.type !== TokenType.Identifier || this.getNextToken(currentTokenInsideParen).type !== TokenType.Identifier) {
                    sendError({
                        message: `Expected a valid argument, got "${currentTokenInsideParen.value}" instead`,
                        line: currentTokenInsideParen.line,
                        column: currentTokenInsideParen.column
                    });
                }

                currentTokenInsideParen = this.getNextToken(currentTokenInsideParen);
                continue;
            }

            if (currentTokenInsideParen.type !== TokenType.Identifier) {
                sendError({
                    message: `Expected a valid argument, got "${currentTokenInsideParen.value}" instead`,
                    line: nextToken.line,
                    column: nextToken.column
                });
            }

            if (previousTokenFromCurrent.type !== TokenType.LeftParen && previousTokenFromCurrent.type !== TokenType.Comma) {
                sendError({
                    message: `Expected "," got "${previousTokenFromCurrent.value}" instead`,
                    line: previousTokenFromCurrent.line,
                    column: previousTokenFromCurrent.column
                });
            }

            parameters.push(currentTokenInsideParen);
            currentTokenInsideParen = this.getNextToken(currentTokenInsideParen);
        }

        if (currentTokenInsideParen.type !== TokenType.RightParen) {
            sendError({
                message: `Expected ")", got "${currentTokenInsideParen.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        const nextTokenAfterRightParen = this.getNextToken(currentTokenInsideParen);

        if (nextTokenAfterRightParen.type !== TokenType.LeftCurly) {
            sendError({
                message: `Expected "{" after ")", got "${nextTokenAfterRightParen.value}" instead`,
                line: nextTokenAfterRightParen.line,
                column: nextTokenAfterRightParen.column
            });
        }

        if (token.localScope) {
            sendError({
                message: `You cannot create nested functions "${nextToken.value}"`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        const indexOfFunctionBodyStart = this.tokens.indexOf(nextTokenAfterRightParen) + 1;
        let currentIndexOnBody = indexOfFunctionBodyStart;

        const functionBodyTokens: Token[] = [];
        const isrightCurly = (token: Token) => token.type === TokenType.RightCurly;

        while (!isrightCurly(this.tokens[currentIndexOnBody])) {
            functionBodyTokens.push(this.tokens[currentIndexOnBody]);
            currentIndexOnBody++;
        }

        const indexOfFunctionBodyEnd = currentIndexOnBody;

        this.tokens.forEach((token, index) => {
            if (index >= indexOfFunctionBodyStart && index <= indexOfFunctionBodyEnd) {
                token.localScope = { name: nextToken.value };
            }
        });

        const isExportAllowed = previousToken.value === keywords.exportDeclaration;

        this.astNodes.push({
            isExportAllowed,
            isFunctionDeclaration: true,
            localScope: nextToken.localScope,
            column: nextToken.column,
            line: nextToken.line,
            functionDeclarationValue: {
                name: nextToken.value,
                body: functionBodyTokens,
                parameters
            }
        });

    }

    private isFunctionCall(token: Token) {
        const nextToken = this.getNextToken(token);

        return (token.type === TokenType.Identifier && nextToken.type === TokenType.LeftParen)
      && this.getPreviousToken(token).value !== keywords.functionDeclaration;
    }

    private parseFunctionCall(token: Token, moduleAccessFieldValue?: ModuleAccessFieldValue) {
        let nextToken = this.getNextToken(this.getNextToken(token));
        const parameters: Token[] = [];

        while (nextToken.type !== TokenType.RightParen) {
            const previousToken = this.getPreviousToken(nextToken);

            if (nextToken.type === TokenType.Comma) {

                if (!this.isValidType(previousToken) || !this.isValidType(this.getNextToken(nextToken))) {
                    sendError({
                        message: `Expected a valid argument, got "${nextToken.value}" instead`,
                        line: nextToken.line,
                        column: nextToken.column
                    });
                }

                nextToken = this.getNextToken(nextToken);
                continue;
            }

            if (!this.isValidType(nextToken)) {
                sendError({
                    message: `Expected a valid argument, got "${nextToken.value}" instead`,
                    line: nextToken.line,
                    column: nextToken.column
                });
            }

            if (previousToken.type !== TokenType.LeftParen && previousToken.type !== TokenType.Comma) {
                sendError({
                    message: `Expected "," got "${previousToken.value}" instead`,
                    line: previousToken.line,
                    column: previousToken.column
                });
            }

            parameters.push(nextToken);
            nextToken = this.getNextToken(nextToken);
        }

        if (nextToken.type !== TokenType.RightParen) {
            sendError({
                message: `Expected ")", got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }

        this.astNodes.push({
            isFunctionCall: true,
            localScope: token.localScope,
            column: token.column,
            line: token.line,
            functionCallValue: {
                name: token.value,
                args: parameters
            },
            moduleAccessFieldValue,
            isModuleAccessField: !!moduleAccessFieldValue
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
            const moduleAccessFieldValue = {
                name: token.value,
                field: nextTokenAfterDot.value,
                isFunctionCall: true
            };

            this.parseFunctionCall(nextTokenAfterDot, moduleAccessFieldValue);
            return;
        }

        this.astNodes.push({
            isModuleAccessField: true,
            isFunctionCall: false,
            column: token.column,
            line: token.line,
            localScope: token.localScope,
            moduleAccessFieldValue: {
                name: token.value,
                field: nextTokenAfterDot.value,
                isFunctionCall: true
            }
        });

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

        if (!this.isValidType(nextTokenAfterEquals)) {
            sendError({
                message: `Expected a valid value after "=", got "${nextTokenAfterEquals.value}" instead`,
                line: nextTokenAfterEquals.line,
                column: nextTokenAfterEquals.column,
            });
        }

        let value = nextTokenAfterEquals.value;
        let isFunctionCall = false;

        if (nextTokenAfterEquals.type === TokenType.Identifier && this.isModuleAccessField(nextTokenAfterEquals)) {
            const nextTokenAfterDot = this.getNextToken(this.getNextToken(nextTokenAfterEquals));

            if (this.isModuleFunctionCall(nextTokenAfterDot)) {
                isFunctionCall = true;
            }

            value = nextTokenAfterDot.value;

        }

        this.astNodes.push({
            isVariableDeclaration: true,
            isFunctionCall,
            column: token.column,
            line: token.line,
            localScope: token.localScope,
            variableDeclarationValue: {
                name: nameToken.value,
                value,
                type: nextTokenAfterEquals.type
            }
        });
    }

    private isVariableAssignment(token: Token) {
        const nextToken = this.getNextToken(token);
        const previousToken = this.getPreviousToken(token);

        return (token.type === TokenType.Identifier && nextToken.type === TokenType.Equals)
      && previousToken.value !== keywords.variableDeclaration;
    }

    private parseVariableAssignment(token: Token) {
        const equalsToken = this.getNextToken(token);
        const nextTokenAfterEquals = this.getNextToken(equalsToken);

        if (!this.isValidType(nextTokenAfterEquals)) {
            sendError({
                message: `Expected a valid value after "=", got "${nextTokenAfterEquals.value}" instead`,
                line: nextTokenAfterEquals.line,
                column: nextTokenAfterEquals.column,
            });
        }

        let value = nextTokenAfterEquals.value;
        let isFunctionCall = false;

        if (nextTokenAfterEquals.type === TokenType.Identifier && this.isModuleAccessField(nextTokenAfterEquals)) {
            const nextTokenAfterDot = this.getNextToken(this.getNextToken(nextTokenAfterEquals));

            if (this.isModuleFunctionCall(nextTokenAfterDot)) {
                isFunctionCall = true;
            }

            value = nextTokenAfterDot.value;
        }

        this.astNodes.push({
            isVariableAssignment: true,
            column: token.column,
            line: token.line,
            isFunctionCall,
            localScope: token.localScope,
            variableAssignmentValue: {
                name: token.value,
                value,
                type: nextTokenAfterEquals.type
            }
        });
    }

    private isExportDeclaration(token: Token) {
        return token.value === keywords.exportDeclaration;
    }

    private parseExportDeclaration(token: Token) {
        const nextToken = this.getNextToken(token);
        const validValuesToBeExported = [keywords.importDeclaration, keywords.functionDeclaration];

        if (!validValuesToBeExported.includes(nextToken.value)) {
            return sendError({
                message: `expected a valid value (${validValuesToBeExported}) after "${keywords.exportDeclaration}", but got "${nextToken.value}" instead`,
                line: nextToken.line,
                column: nextToken.column
            });
        }
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

            else if (this.isFunctionCall(currentToken) && !this.isModuleFunctionCall(currentToken)) {
                this.parseFunctionCall(currentToken);
            }

            else if (this.isModuleAccessField(currentToken)) {
                await this.parseModuleAccessField(currentToken);
            }

            else if (this.isVariableDeclaration(currentToken)) {
                this.parseVariableDeclaration(currentToken);
            }

            else if (this.isVariableAssignment(currentToken)) {
                this.parseVariableAssignment(currentToken);
            }

            else if (this.isFunctionReturn(currentToken)) {
                this.parseFunctionReturn(currentToken);
            }

            else if (this.isExportDeclaration(currentToken)) {
                this.parseExportDeclaration(currentToken);
            }

            this.advance();
        }

        return {
            astNodes: this.astNodes,
            importModules: this.importModules
        };

    }

}
