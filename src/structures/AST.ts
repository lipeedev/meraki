import { LocalScope, Token, TokenType } from './Token';

export enum ASTNodeType {
  FunctionDeclaration,
  FunctionCall,
  ModuleAccessField
}

export type FunctionDeclarationValue = {
  name: string,
  body: Token[],
  parameters: Token[]
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

export type VariableAssignmentValue = {
  name: string,
  value: string,
  type: TokenType
}

export type FuncionReturnValue = {
  value: string,
  type: TokenType
}

export type CustomImportValue = {
  path: string,
  file: string
}

export interface ASTNode {
  isExportAllowed?: boolean;
  isFunctionReturn?: boolean;
  isFunctionCall?: boolean;
  isModuleAccessField?: boolean;
  isFunctionDeclaration?: boolean;
  isVariableDeclaration?: boolean;
  isVariableAssignment?: boolean;
  isCustomImport?: boolean;
  functionCallValue?: FunctionCallValue;
  moduleAccessFieldValue?: ModuleAccessFieldValue;
  functionDeclarationValue?: FunctionDeclarationValue;
  variableDeclarationValue?: VariableDeclarationValue;
  variableAssignmentValue?: VariableAssignmentValue;
  functionReturnValue?: FuncionReturnValue;
  customImportValue?: CustomImportValue;
  line: number;
  column: number;
  localScope?: LocalScope;
}
