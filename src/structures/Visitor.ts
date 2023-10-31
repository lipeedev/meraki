import { sendError } from '../utils/sendError';
import { ASTNode } from './AST';

type importModule = {
  name: string,
  exports: any
}

export class Visitor {
    constructor(private astNodes: ASTNode[], private importModules?: importModule[]) { }

    visit() {
        for (const node of this.astNodes) {

            //module Access Field
            if (node.isModuleAccessField) {
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
                    const functionInAst = this.astNodes.find(_node => _node.isFunctionCall && _node.functionCallValue?.name === (node.moduleAccessFieldValue?.field) as string);
                    const functionCall = myModule?.exports[node.moduleAccessFieldValue?.field as string];

                    if (!functionCall) {
                        sendError({
                            message: `Function "${node.moduleAccessFieldValue?.field}" not found in module "${node.moduleAccessFieldValue?.name}"`,
                            line: node.line,
                            column: node.column
                        });
                    }

                    const args = functionInAst?.functionCallValue?.args.map(arg => arg.value);
                    functionCall(...args as string[]);
                }

                //TODO: static property access

            }

            // TODO: Add more cases
        }
    }
}
