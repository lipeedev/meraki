import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSizeMinimum = 2;

export function sum({ args, line, column, variables, functionsReturn }: ModuleFunctionCallParams) {
    if (args.length < argsSizeMinimum) {
        return sendError({
            message: `sum() takes at least ${argsSizeMinimum} arguments`,
            line,
            column
        });
    }

    for (const arg of args) {
        if (arg.type === TokenType.Identifier) {
            const variable = variables.find(variable => variable.name === arg.value);
            const functionReturn = functionsReturn.find(functionReturn => functionReturn.name === arg.value);

            if (variable && variable.isFunctionCall) {
                const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));
                arg.value = functionFound?.returnValue;
                arg.type = functionFound?.type!;
            }

            else if (variable) {
                arg.value = variable.value;
                arg.type = variable.type;
            }

            else if (functionReturn) {
                arg.value = functionReturn.returnValue;
                arg.type = functionReturn.type!;
            }

            else {
                return sendError({
                    message: `Variable ${arg.value} not found`,
                    line: arg.line,
                    column: arg.column
                });
            }

        }
    }

    const numberDefaultTypeValue = `<${Buffer.from('type').toString('hex')}_number>`;
    const isAllArgsNumber = args.every(arg => arg.type === TokenType.Number && arg.value !== numberDefaultTypeValue);

    if (!isAllArgsNumber) {
        return sendError({
            message: 'sum() takes only numbers',
            line,
            column
        });
    }

    const sum = args.reduce((acc, arg) => acc + Number(arg.value), 0);

    return {
        type: TokenType.Number,
        returnValue: sum,
    };


}
