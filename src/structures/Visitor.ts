import isArrayEquals from '../utils/isArrayEquals';
import { sendError } from '../utils/sendError';
import { ASTNode } from './AST';
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
  returnValue?: any
  variableFunction?: VariableFuncton
}

export type ModuleFunctionCallParams = {
  functionsReturn: FunctionReturnData[],
  variables: Variable[],
  args: Token[],
  line: number,
  column: number
}

export class Visitor {
  private variables: Variable[] = [];
  private functionReturnList: FunctionReturnData[] = []
  private functionDeclarationList: FunctionDeclaration[] = [];
  private astNodes: ASTNode[];
  private importModules?: ImportModule[];
  private position = 0;

  constructor(astNodes: ASTNode[], importModules?: ImportModule[], functionDeclarationList?: FunctionDeclaration[]) {
    this.astNodes = astNodes;
    this.importModules = importModules;
    this.functionDeclarationList = functionDeclarationList ?? [];
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

  private manageModuleAccessFieldFunctionCall(node: ASTNode, myModule: ImportModule) {
    const functionCall = myModule?.exports[node.moduleAccessFieldValue?.field as string] as (param: ModuleFunctionCallParams) => any;

    if (!functionCall) {
      sendError({
        message: `Function "${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
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

    const functionAfterCall = functionCall({
      functionsReturn: this.functionReturnList,
      variables: this.variables,
      args: args!,
      line: node.line,
      column: node.column
    })

    let variableFunction: VariableFuncton | undefined;

    if (this.getPreviousNode()?.isVariableDeclaration) {
      variableFunction = {
        name: this.getPreviousNode()?.variableDeclarationValue?.name!
      }
    }

    if (functionAfterCall?.returnValue) {
      this.functionReturnList.push({
        name: node.functionCallValue?.name!,
        line: node.line,
        column: node.column,
        returnValue: functionAfterCall.returnValue,
        variableFunction
      })
    }

  }

  private manageModuleAccessField(node: ASTNode) {
    const myModule = this.importModules?.find(mod => mod.name === node.moduleAccessFieldValue?.name);

    if (!myModule) {
      sendError({
        message: `Module ${node.moduleAccessFieldValue?.name} not found`,
        line: node.line,
        column: node.column
      });
    }

    const isModuleAcessFieldFunctionCall = node.isFunctionCall && node.isModuleAccessField;

    if (isModuleAcessFieldFunctionCall) {
      this.manageModuleAccessFieldFunctionCall(node, myModule as ImportModule);
    }

    //TODO: static module fields access
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

      if (!variableToAssign && !functionReturnToAssign && !isVariableFunctionModule) {
        return sendError({
          message: `"${node.variableDeclarationValue?.value}" not found`,
          line: node.line,
          column: node.column
        });
      }

      if (!isVariableFunctionModule) {
        const value = variableToAssign?.value ?? functionReturnToAssign?.returnValue;
        const isFunctionCall = variableToAssign?.isFunctionCall ?? true;
        const type = variableToAssign?.type ?? TokenType.Identifier

        if (functionReturnToAssign) {
          const indexOfTheFunction = this.functionReturnList.indexOf(functionReturnToAssign);
          const variableFunctionReferences = functionReturnToAssign.variableFunction?.references ?? [];

          this.functionReturnList[indexOfTheFunction]!.variableFunction!
            .references = [node.variableDeclarationValue?.name!, ...variableFunctionReferences]
        }

        this.variables.push({ name: node.variableDeclarationValue?.name, value, type, isFunctionCall });

        return
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

      if (!variableToAssign && !functionReturnToAssign) {
        return sendError({
          message: `"${node.variableAssignmentValue?.value}" not found`,
          line: node.line,
          column: node.column
        });
      }

      const value = variableToAssign?.value ?? functionReturnToAssign?.returnValue;

      if (functionReturnToAssign) {
        const indexOfTheFunction = this.functionReturnList.indexOf(functionReturnToAssign);
        const variableFunctionReferences = functionReturnToAssign.variableFunction?.references ?? [];

        this.functionReturnList[indexOfTheFunction]!.variableFunction!
          .references = [node.variableAssignmentValue?.name!, ...variableFunctionReferences]

        variable.isFunctionCall = true;
      }

      variable.value = value;
      return;
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

    if (!functionDeclaration) {
      return sendError({
        message: `Function "${node.functionCallValue?.name}" not found`,
        line: node.line,
        column: node.column
      });
    }

    new Visitor(functionDeclaration.body, this.importModules, this.functionDeclarationList).visit();

  }

  public async visit() {
    while (!this.isEndOfAST) {
      const node = this.getCurrentNode();

      if (node.isModuleAccessField) {
        this.manageModuleAccessField(node);
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

      // TODO: Add more cases
    }
  }
}
