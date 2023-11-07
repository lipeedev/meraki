import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSize = 1;

export function print({ variables, functionsReturn, line, args, column }: ModuleFunctionCallParams) {
    if (args.length < argsSize) {
        return sendError({
            message: `Expected ${argsSize} arguments, but got ${args.length}`,
            line,
            column
        });
    }

    const valuesToPrint = [];

    for (const arg of args) {
        if (arg.type === TokenType.Identifier) {
            const variable = variables.find(variable => variable.name === arg.value);
            const functionReturn = functionsReturn.find(functionReturn => functionReturn.name === arg.value);

            if (variable && variable.isFunctionCall) {
                const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));

                if (functionFound?.type === TokenType.Array) {
                    functionFound.returnValue = `Array(${functionFound.returnValue.length}) %{ ${functionFound.returnValue.map((value: unknown[]) => typeof value === 'string' ? `'${value}'` : value).join(', ')} }`;
                }

                valuesToPrint.push(functionFound?.returnValue!);
            }

            else if (variable) {
                valuesToPrint.push(variable.value);
            }

            else if (functionReturn) {
                valuesToPrint.push(functionReturn.returnValue);
            }

            else {
                return sendError({
                    message: `Variable ${arg.value} not found`,
                    line: arg.line,
                    column: arg.column
                });
            }

        }
        else {
            valuesToPrint.push(arg.value);
        }
    }

    console.log(...valuesToPrint);
}
