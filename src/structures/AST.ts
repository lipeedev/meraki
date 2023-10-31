import { Token, TokenType } from './Token';

export enum ASTNodeType {
  FunctionDeclaration,
  FunctionCall,
  ModuleAccessField
}

export type FunctionDeclarationValue = {
  name: string,
  body: Token[]
}

export type FunctionCallValue = {
  name: string,
  args: Token[]
}

export type ModuleAccessFieldValue = {
  name: string,
  field: string,
  isFunctionCall: boolean
}

export type VariableDeclarationValue = {
  name: string,
  value: string,
  type: TokenType
}

export interface ASTNode {
  isFunctionCall?: boolean;
  isModuleAccessField?: boolean;
  isFunctionDeclaration?: boolean;
  isVariableDeclaration?: boolean;
  functionCallValue?: FunctionCallValue;
  moduleAccessFieldValue?: ModuleAccessFieldValue;
  functionDeclarationValue?: FunctionDeclarationValue;
  variableDeclarationValue?: VariableDeclarationValue;
  line: number;
  column: number;
}
