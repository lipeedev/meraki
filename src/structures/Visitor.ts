import { sendError } from '../utils/sendError';
import { ASTNode } from './AST';
import { TokenType } from './Token';

export type ImportModule = {
  name: string,
  exports: any
}

export type Variable = {
  name: string,
  value: any,
  type: TokenType
}

export class Visitor {
  private variables: Variable[] = [];

  constructor(private astNodes: ASTNode[], private importModules?: ImportModule[]) { }

  private manageModuleAccessFieldFunctionCall(node: ASTNode, myModule: ImportModule) {
    const functionInAst = this.astNodes.find(_node => _node.isFunctionCall && _node.functionCallValue?.name === (node.moduleAccessFieldValue?.field) as string);
    const functionCall = myModule?.exports[node.moduleAccessFieldValue?.field as string];

    if (!functionCall) {
      sendError({
        message: `Function "${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
        line: node.line,
        column: node.column
      });
    }

    const args = functionInAst?.functionCallValue?.args!;
    functionCall(this.variables, args);
  }

  private manageModuleAccessField(node: ASTNode) {
    const myModule = this.importModules?.find(mod => mod.name === node.moduleAccessFieldValue?.name);

    if (!module) {
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

  public visit() {
    for (const node of this.astNodes) {

      if (node.isModuleAccessField) {
        this.manageModuleAccessField(node)
      }

      if (node.isVariableDeclaration) {
        this.manageVariableDeclaration(node);
      }

      // TODO: Add more cases
    }
  }
}
