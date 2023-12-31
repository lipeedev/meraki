import getTokenTypeFromValue from '../utils/getTokenTypeFromValue';
import isArrayEquals from '../utils/isArrayEquals';
import { sendError } from '../utils/sendError';
import { ASTNode } from './AST';
import { Lexer } from './Lexer';
import { Parser } from './Parser';
import { Token, TokenType } from './Token';

export type ImportModule = {
  name: string,
  exports: any
}

export type Variable = {
  name: string,
  value: any,
  type: TokenType,
  isFunctionCall?: boolean
}

export type FunctionDeclaration = {
  name: string,
  args?: Token[],
  body: ASTNode[]
}

type VariableFuncton = {
  name: string,
  references?: string[]
}

export type FunctionReturnData = {
  line: number,
  column: number,
  name: string,
  returnValue?: any,
  variableFunction?: VariableFuncton,
  type?: TokenType
}

export type ModuleFunctionCallParams = {
  functionsDeclaration: FunctionDeclaration[]
  functionsReturn: FunctionReturnData[],
  importModules: ImportModule[],
  variables: Variable[],
  args: Token[],
  line: number,
  column: number
}

export class Visitor {
    private variables: Variable[];
    private functionReturnList: FunctionReturnData[] = [];
    private functionDeclarationList: FunctionDeclaration[] = [];
    private astNodes: ASTNode[];
    private importModules?: ImportModule[];
    private position = 0;

    constructor(astNodes: ASTNode[], importModules?: ImportModule[], functionDeclarationList?: FunctionDeclaration[], variables?: Variable[]) {
        this.astNodes = astNodes;
        this.importModules = importModules;
        this.functionDeclarationList = functionDeclarationList ?? [];
        this.variables = variables ?? [];
    }

    private get isEndOfAST() {
        return this.position >= this.astNodes.length;
    }

    private getCurrentNode() {
        return this.astNodes[this.position];
    }

    private getPreviousNode() {
        return this.astNodes[this.position - 1];
    }

    private advance() {
        this.position++;
    }

    private async manageModuleAccessFieldFunctionCall(node: ASTNode, myModule: ImportModule) {
        const functionCall = myModule?.exports[node.moduleAccessFieldValue?.field as string] as (param: ModuleFunctionCallParams) => any;

        if (!functionCall) {
            sendError({
                message: `"${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
                line: node.line,
                column: node.column
            });
        }

        let args: Token[];

        if (!node.localScope) {
            args = this.astNodes.find(_node => !_node.localScope && _node.isFunctionCall && _node.isModuleAccessField && _node.functionCallValue?.name === node.functionCallValue?.name && isArrayEquals(_node.functionCallValue?.args!, node.functionCallValue?.args!))?.functionCallValue?.args!;
        }
        else {
            args = this.astNodes.find(_node => _node.localScope?.name === node.localScope?.name && _node.isFunctionCall && _node.isModuleAccessField && _node.functionCallValue?.name === node.functionCallValue?.name && isArrayEquals(_node.functionCallValue?.args!, node.functionCallValue?.args!))?.functionCallValue?.args!;
        }

        let functionAfterCall;

        try {
            functionAfterCall = await functionCall({
                importModules: this.importModules!,
                functionsDeclaration: this.functionDeclarationList,
                functionsReturn: this.functionReturnList,
                variables: this.variables,
                args: args!,
                line: node.line,
                column: node.column
            });
        } catch {
            sendError({
                message: `"${node.moduleAccessFieldValue?.field}" in module "${node.moduleAccessFieldValue?.name}" is not a function, remove the "()"`,
                line: node.line,
                column: node.column
            });
        }

        let variableFunction: VariableFuncton | undefined;

        if (this.getPreviousNode()?.isVariableDeclaration) {
            variableFunction = {
                name: this.getPreviousNode()?.variableDeclarationValue?.name!
            };
        }

        if (functionAfterCall?.returnValue !== undefined) {
            this.functionReturnList.push({
                name: node.functionCallValue?.name!,
                line: node.line,
                type: functionAfterCall?.type,
                column: node.column,
                returnValue: functionAfterCall.returnValue,
                variableFunction
            });
        }

    }

    private async manageModuleAccessField(node: ASTNode) {
        const myModule = this.importModules?.find(mod => mod.name === node.moduleAccessFieldValue?.name);
        const mapVariable = this.variables.find(variable => variable.name === node.moduleAccessFieldValue?.name) as { [key: string]: any };

        if (!myModule && !mapVariable) {
            sendError({
                message: `Module/Variable ${node.moduleAccessFieldValue?.name} not found`,
                line: node.line,
                column: node.column
            });
        }

        if (mapVariable) {
            if (this.getPreviousNode().isVariableDeclaration || this.getPreviousNode().isVariableAssignment) {
                const indexOfVariableToAssign = this.variables.findIndex(variable => variable.name === (this.getPreviousNode().variableDeclarationValue?.name ?? this.getPreviousNode().variableAssignmentValue?.name));

                this.variables[indexOfVariableToAssign].value = mapVariable.value[node.moduleAccessFieldValue?.field!];
                this.variables[indexOfVariableToAssign].type = getTokenTypeFromValue(mapVariable.value[node.moduleAccessFieldValue?.field!]) as TokenType;

            }

            return mapVariable;
        }

        const isModuleAcessFieldFunctionCall = node.isFunctionCall && node.isModuleAccessField;

        if (isModuleAcessFieldFunctionCall) {
            return await this.manageModuleAccessFieldFunctionCall(node, myModule as ImportModule);
        }

        const staticField = myModule?.exports[node.moduleAccessFieldValue?.field as string];

        if (!staticField) {
            sendError({
                message: `Field "${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
                line: node.line,
                column: node.column
            });
        }

        if (this.getPreviousNode().isVariableDeclaration || this.getPreviousNode().isVariableAssignment) {
            const indexOfVariableToAssign = this.variables.findIndex(variable => variable.name === (this.getPreviousNode().variableDeclarationValue?.name ?? this.getPreviousNode().variableAssignmentValue?.name));
            this.variables[indexOfVariableToAssign].value = staticField.value;
            this.variables[indexOfVariableToAssign].type = staticField.type;
        }

        return staticField;
    }

    private manageVariableDeclaration(node: ASTNode) {
        const variableAlreadyExists = this.variables.some(variable => variable.name === node.variableDeclarationValue?.name);

        if (variableAlreadyExists) {
            sendError({
                message: `Variable "${node.variableDeclarationValue?.name}" already exists`,
                line: node.line,
                column: node.column
            });
        }

        if (node.variableDeclarationValue?.type === TokenType.Identifier) {
            const variableToAssign = this.variables.find(variable => variable.name === node.variableDeclarationValue?.value);
            const functionReturnToAssign = this.functionReturnList.find(functionReturn => functionReturn.variableFunction?.name === node.variableDeclarationValue?.value);
            const isVariableFunctionModule = this.importModules?.some(mod => mod.exports[node.variableDeclarationValue?.value as string]);
            const isVariableFunctionDeclaration = this.functionDeclarationList.some(func => func.name === node.variableDeclarationValue?.value);
            const mapVariable = this.variables.find(variable => variable.value[node.variableDeclarationValue?.value] !== undefined);

            if (!isVariableFunctionDeclaration && !variableToAssign && !functionReturnToAssign && !isVariableFunctionModule && !mapVariable) {
                return sendError({
                    message: `"${node.variableDeclarationValue?.value}" not found`,
                    line: node.line,
                    column: node.column
                });
            }

            if (!isVariableFunctionModule && !isVariableFunctionDeclaration) {
                const value = variableToAssign?.value ?? functionReturnToAssign?.returnValue ?? mapVariable?.value[node.variableDeclarationValue?.value];
                const isFunctionCall = variableToAssign?.isFunctionCall ?? mapVariable?.isFunctionCall ?? true;
                const type = variableToAssign?.type ?? getTokenTypeFromValue(mapVariable?.type) ?? TokenType.Identifier;

                if (functionReturnToAssign) {
                    const indexOfTheFunction = this.functionReturnList.indexOf(functionReturnToAssign);
                    const variableFunctionReferences = functionReturnToAssign.variableFunction?.references ?? [];

          this.functionReturnList[indexOfTheFunction]!.variableFunction!
              .references = [node.variableDeclarationValue?.name!, ...variableFunctionReferences];
                }

                this.variables.push({ name: node.variableDeclarationValue?.name, value, type, isFunctionCall });

                return;
            }

            if (isVariableFunctionDeclaration) {
                node.isFunctionCall = true;
            }

        }

        this.variables.push({
            name: node.variableDeclarationValue?.name as string,
            value: node.variableDeclarationValue?.value,
            type: node.variableDeclarationValue?.type as TokenType,
            isFunctionCall: node.isFunctionCall
        });
    }

    private manageVariableAssignment(node: ASTNode) {
        const variable = this.variables.find(variable => variable.name === node.variableAssignmentValue?.name);

        if (!variable) {
            return sendError({
                message: `Variable "${node.variableAssignmentValue?.name}" not found`,
                line: node.line,
                column: node.column
            });
        }

        if (node.variableAssignmentValue?.type !== variable.type && node.variableAssignmentValue?.type !== TokenType.Identifier) {
            return sendError({
                message: `Variable "${variable.name}" is of type "${variable.type}" and cannot be assigned to a value of type "${node.variableAssignmentValue?.type}"`,
                line: node.line,
                column: node.column
            });
        }

        if (node.variableAssignmentValue?.type === TokenType.Identifier) {
            const variableToAssign = this.variables.find(variable => variable.name === node.variableAssignmentValue?.value);
            const functionReturnToAssign = this.functionReturnList.find(functionReturn => functionReturn.variableFunction?.name === node.variableAssignmentValue?.value);
            const isVariableFunctionModule = this.importModules?.some(mod => mod.exports[node.variableAssignmentValue?.value as string]);
            const isVariableFunctionDeclaration = this.functionDeclarationList.some(func => func.name === node.variableAssignmentValue?.value);

            if (!variableToAssign && !functionReturnToAssign && !isVariableFunctionModule && !isVariableFunctionDeclaration) {
                return sendError({
                    message: `"${node.variableAssignmentValue?.value}" not found`,
                    line: node.line,
                    column: node.column
                });
            }

            if (!isVariableFunctionModule && !isVariableFunctionDeclaration) {
                const value = variableToAssign?.value ?? functionReturnToAssign?.returnValue;
                const isFunctionCall = variableToAssign?.isFunctionCall ?? true;
                const type = variableToAssign?.type ?? TokenType.Identifier;

                if (functionReturnToAssign) {
                    const indexOfTheFunction = this.functionReturnList.indexOf(functionReturnToAssign);
                    const variableFunctionReferences = functionReturnToAssign.variableFunction?.references ?? [];

          this.functionReturnList[indexOfTheFunction]!.variableFunction!
              .references = [node.variableAssignmentValue?.name!, ...variableFunctionReferences];
                }

                variable.value = value;
                variable.type = type;
                variable.isFunctionCall = isFunctionCall;
                return;
            }

            if (isVariableFunctionDeclaration) {
                node.isFunctionCall = true;
            }

        }

        variable.value = node.variableAssignmentValue?.value!;
    }

    private async manageFunctionDeclaration(node: ASTNode) {
        const functionAlreadyExists = this.functionDeclarationList.some(func => func.name === node.functionDeclarationValue?.name);

        if (functionAlreadyExists) {
            return sendError({
                message: `Function "${node.functionDeclarationValue?.name}" already exists`,
                line: node.line,
                column: node.column
            });
        }

        const functionBodyParser = new Parser(node.functionDeclarationValue?.body!);
        const functionBodyParsed = await functionBodyParser.parse();

        this.functionDeclarationList.push({
            name: node.functionDeclarationValue?.name!,
            body: functionBodyParsed.astNodes,
            args: node.functionDeclarationValue?.parameters
        });

        const firstNodeOutsideFunctionBody = this.astNodes.find((_node, index) => _node.localScope?.name !== node.functionDeclarationValue?.name && index > this.astNodes.indexOf(node));

        if (firstNodeOutsideFunctionBody) {
            this.position = this.astNodes.indexOf(firstNodeOutsideFunctionBody) - 1;
        }
        else {
            this.position = this.astNodes.length;
        }
    }

    private manageFunctionCall(node: ASTNode) {
        const functionDeclaration = this.functionDeclarationList.find(func => func.name === node.functionCallValue?.name);
        let parameters: Variable[] | undefined;

        if (!functionDeclaration) {
            return sendError({
                message: `"${node.functionCallValue?.name}" not found`,
                line: node.line,
                column: node.column
            });
        }

        if (functionDeclaration.args?.length) {

            if (functionDeclaration.args?.length !== node.functionCallValue?.args.length) {
                return sendError({
                    message: `"${functionDeclaration.name} expect ${functionDeclaration.args?.length} arguments, but got ${node.functionCallValue?.args.length} instead`,
                    line: node.line,
                    column: node.column
                });
            }

            parameters = functionDeclaration.args.map((arg, index) => {

                if (node.functionCallValue?.args[index].type === TokenType.Identifier) {
                    const variable = this.variables.find(variable => variable.name === node.functionCallValue?.args[index].value);
                    const functionReturn = this.functionReturnList.find(functionReturn => functionReturn.variableFunction?.name === node.functionCallValue?.args[index].value);

                    if (!variable && !functionReturn) {
                        sendError({
                            message: `"${node.functionCallValue?.args[index].value}" not found`,
                            line: node.line,
                            column: node.column
                        });
                    }

                    if (variable && variable.isFunctionCall) {
                        const functionFound = this.functionReturnList.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));

                        variable.value = functionFound?.returnValue;
                        variable.type = functionFound?.type!;
                        variable.isFunctionCall = false;
                    }

                    else if (functionReturn) {
                        const indexOfTheFunction = this.functionReturnList.indexOf(functionReturn);
                        const variableFunctionReferences = functionReturn.variableFunction?.references ?? [];

            this.functionReturnList[indexOfTheFunction]!.variableFunction!
                .references = [arg.value!, ...variableFunctionReferences];
                    }

                    const value = variable?.value ?? functionReturn?.returnValue;
                    const type = variable?.type ?? functionReturn?.type!;

                    if (type !== arg.type) {
                        sendError({
                            message: `"${functionDeclaration.name}" expect ${arg.type} as argument ${index + 1}, but got ${type} instead`,
                            line: node.line,
                            column: node.column
                        });
                    }

                    return {
                        name: arg.value!,
                        type,
                        value,
                        isFunctionCall: variable?.isFunctionCall ?? true
                    };
                }

                if (arg.type !== node.functionCallValue?.args[index].type) {
                    sendError({
                        message: `"${functionDeclaration.name}" expect ${arg.type} as argument ${index + 1}, but got ${node.functionCallValue?.args[index].type} instead`,
                        line: node.line,
                        column: node.column
                    });
                }

                return {
                    name: arg.value,
                    value: node.functionCallValue?.args[index].value!,
                    type: node.functionCallValue?.args[index].type!,
                    isFunctionCall: false
                };
            });

        }

        const functionReturn = functionDeclaration.body.find(token => token.isFunctionReturn);

        if (functionReturn) {
            let variableFunction: VariableFuncton | undefined;

            if (this.getPreviousNode()?.isVariableDeclaration) {
                variableFunction = {
                    name: this.getPreviousNode()?.variableDeclarationValue?.name!
                };
            }

            functionDeclaration.body = functionDeclaration.body.slice(0, functionDeclaration.body.indexOf(functionReturn) + 1);

            new Visitor(functionDeclaration.body, this.importModules, this.functionDeclarationList, parameters).visit();

            this.functionReturnList.push({
                name: node.functionCallValue?.name!,
                line: node.line,
                column: node.column,
                variableFunction,
                returnValue: functionReturn?.functionReturnValue?.value,
                type: functionReturn?.functionReturnValue?.type
            });

            return;
        }

        new Visitor(functionDeclaration.body, this.importModules, this.functionDeclarationList, parameters).visit();
    }

    private manageFunctionReturn(node: ASTNode) {
        const returnValue = node.functionReturnValue;

        if (returnValue?.type === TokenType.Identifier) {
            const variable = this.variables.find(variable => variable.name === returnValue?.value);
            const functionReturn = this.functionReturnList.find(functionReturn => functionReturn.variableFunction?.name === returnValue?.value);

            if (!variable && !functionReturn) {
                return sendError({
                    message: `"${returnValue?.value}" not found`,
                    line: node.line,
                    column: node.column
                });
            }

            if (variable && variable.isFunctionCall) {
                const functionFound = this.functionReturnList.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));

                variable.value = functionFound?.returnValue;
                variable.type = functionFound?.type!;
                variable.isFunctionCall = false;
            }

            else if (functionReturn) {
                const indexOfTheFunction = this.functionReturnList.indexOf(functionReturn);
                const variableFunctionReferences = functionReturn.variableFunction?.references ?? [];

        this.functionReturnList[indexOfTheFunction]!.variableFunction!
            .references = [node.functionReturnValue?.value!, ...variableFunctionReferences];
            }

      node.functionReturnValue!.value = variable?.value ?? functionReturn?.returnValue;
      node.functionReturnValue!.type = variable?.type ?? functionReturn?.type!;

        }

        this.functionReturnList.push({
            name: node.functionReturnValue?.value!,
            line: node.line,
            column: node.column,
            returnValue: node.functionReturnValue?.value,
            type: node.functionReturnValue?.type
        });

    }

    private async manageCustomImport(node: ASTNode) {

        const lexer = new Lexer(node.customImportValue?.file!);
        const parser = new Parser(lexer.lex(), node.customImportValue?.path);

        const { importModules, astNodes } = await parser.parse();
        const exportedNodes = astNodes.filter(_node => _node.isExportAllowed);

        if (!exportedNodes.length) {
            return sendError({
                message: `"${node.customImportValue?.path}" has no exported fields`,
                line: node.line,
                column: node.column
            });
        }

        const astNodesBefore = this.astNodes.slice(0, this.position);
        const astNodesAfter = this.astNodes.slice(this.position + 1, this.astNodes.length);

        this.importModules = [...new Set([...importModules, ...this.importModules!])];
        this.astNodes = [...astNodesBefore, ...exportedNodes, ...astNodesAfter];
        this.position -= 1;
    }

    public async visit() {
        while (!this.isEndOfAST) {
            const node = this.getCurrentNode();

            if (node.isModuleAccessField) {
                await this.manageModuleAccessField(node);
                this.advance();
            }

            if (node.isVariableDeclaration) {
                this.manageVariableDeclaration(node);
                this.advance();
            }

            if (node.isVariableAssignment) {
                this.manageVariableAssignment(node);
                this.advance();
            }

            if (node.isFunctionDeclaration) {
                await this.manageFunctionDeclaration(node);
                this.advance();
            }

            if (node.isFunctionCall && !node.isModuleAccessField && !node.isVariableDeclaration) {
                this.manageFunctionCall(node);
                this.advance();
            }

            if (node.isFunctionReturn) {
                this.manageFunctionReturn(node);
                this.advance();
            }

            if (node.isCustomImport) {
                await this.manageCustomImport(node);
                this.advance();
            }
        }

        return { returnList: this.functionReturnList };
    }
}
