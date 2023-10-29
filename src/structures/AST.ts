import { Token } from "./Token";

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

export interface ASTNode {
  isFunctionCall?: boolean;
  isModuleAccessField?: boolean;
  isFunctionDeclaration?: boolean;
  functionCallValue?: FunctionCallValue;
  moduleAccessFieldValue?: ModuleAccessFieldValue;
  functionDeclarationValue?: FunctionDeclarationValue;
  line: number;
  column: number;
}
