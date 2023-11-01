import { sendError } from '../utils/sendError';
import { ASTNode } from './AST';
import { Token, TokenType } from './Token';

export type ImportModule = {
  name: string,
  exports: any
}

export type Variable = {
  name: string,
  value: any,
  type: TokenType
}

export type FunctionDeclaration = {
  name: string,
  args?: Token[],
  body: ASTNode[]
}

export class Visitor {
  private variables: Variable[] = [];
  private functionDeclarationList: FunctionDeclaration[] = [];
  private astNodes: ASTNode[];
  private importModules?: ImportModule[];
  private position = 0;

  constructor(astNodes: ASTNode[], importModules?: ImportModule[]) {
    this.astNodes = astNodes;
    this.importModules = importModules;
  }

  private get isEndOfAST() {
    return this.position >= this.astNodes.length;
  }

  private getCurrentNode() {
    return this.astNodes[this.position];
  }

  private advance() {
    this.position++;
  }

  private manageModuleAccessFieldFunctionCall(node: ASTNode, myModule: ImportModule) {
    const functionCall = myModule?.exports[node.moduleAccessFieldValue?.field as string];

    if (!functionCall) {
      sendError({
        message: `Function "${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
        line: node.line,
        column: node.column
      });
    }

    let args: Token[];

    if (!node.localScope) {
      args = this.astNodes.find(_node => !_node.localScope && _node.isFunctionCall && _node.isModuleAccessField && _node.functionCallValue?.name === node.functionCallValue?.name)?.functionCallValue?.args!;
    }
    else {
      args = this.astNodes.find(_node => _node.localScope?.name === node.localScope?.name && _node.isFunctionCall && _node.isModuleAccessField && _node.functionCallValue?.name === node.functionCallValue?.name)?.functionCallValue?.args!;
    }

    functionCall(this.variables, args);
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
      })
    }

    this.variables.push({
      name: node.variableDeclarationValue?.name as string,
      value: node.variableDeclarationValue?.value,
      type: node.variableDeclarationValue?.type as TokenType
    });
  }

  private manageVariableAssignment(node: ASTNode) {
    const variable = this.variables.find(variable => variable.name === node.variableAssignmentValue?.name);

    if (!variable) {
      return sendError({
        message: `Variable "${node.variableAssignmentValue?.name}" not found`,
        line: node.line,
        column: node.column
      })
    }

    if (node.variableAssignmentValue?.type !== variable.type && node.variableAssignmentValue?.type !== TokenType.Identifier) {
      return sendError({
        message: `Variable "${variable.name}" is of type "${variable.type}" and cannot be assigned to a value of type "${node.variableAssignmentValue?.type}"`,
        line: node.line,
        column: node.column
      })
    }

    if (node.variableAssignmentValue?.type === TokenType.Identifier) {
      const variableToAssign = this.variables.find(variable => variable.name === node.variableAssignmentValue?.value);

      if (!variableToAssign) {
        return sendError({
          message: `Variable "${node.variableAssignmentValue?.value}" not found`,
          line: node.line,
          column: node.column
        })
      }

      variable.value = variableToAssign.value;
      return;
    }

    variable.value = node.variableAssignmentValue?.value!;
  }

  private manageFunctionDeclaration(node: ASTNode) {
    const functionAlreadyExists = this.functionDeclarationList.some(func => func.name === node.functionDeclarationValue?.name);

    if (functionAlreadyExists) {
      return sendError({
        message: `Function "${node.functionDeclarationValue?.name}" already exists`,
        line: node.line,
        column: node.column
      })
    }

    this.functionDeclarationList.push({
      name: node.functionDeclarationValue?.name!,
      body: node.functionDeclarationValue?.body!
    });

    const firstNodeOutsideFunctionBody = this.astNodes.find((_node, index) => _node.localScope?.name !== node.functionDeclarationValue?.name && index > this.astNodes.indexOf(node));

    if (firstNodeOutsideFunctionBody) {
      this.position = this.astNodes.indexOf(firstNodeOutsideFunctionBody) - 1;
    }
    else {
      this.position = this.astNodes.length;
    }
  }

  public visit() {
    while (!this.isEndOfAST) {
      const node = this.getCurrentNode();

      if (node.isModuleAccessField) {
        this.manageModuleAccessField(node)
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
        this.manageFunctionDeclaration(node);
        this.advance();
      }

      // TODO: Add more cases
    }
  }
}
