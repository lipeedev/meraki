import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const minimumArgsSize = 2;

export function printf({ args, line, column, variables, functionsReturn }: ModuleFunctionCallParams) {
    if (args.length < minimumArgsSize) {
        return sendError({
            message: `Expected at least ${minimumArgsSize} arguments but got ${args.length}`,
            line,
            column
        });
    }

    if (args[0].type !== TokenType.String && args[0].type !== TokenType.Identifier) {
        return sendError({
            message: `Expected a String as first argument but got ${args[0].type}`,
            line,
            column
        });
    }

    if (args[0].type === TokenType.Identifier) {
        const variable = variables.find(variable => variable.name === args[0].value);
        const returnVariable = functionsReturn.find(variable => variable.name === args[0].value);

        if (!variable && !returnVariable) {
            return sendError({
                message: `${args[0].value} not found`,
                line,
                column
            });
        }

        if (variable?.type !== TokenType.String && returnVariable?.type !== TokenType.String) {
            return sendError({
                message: `Expected a String as first argument but got ${variable?.type}`,
                line,
                column
            });
        }

        args[0].value = variable?.value ?? returnVariable?.returnValue;
    }

    let stringValue = args[0].value;

    args.forEach((arg, index) => {
        if (index !== 0) {
            let value = arg.value;

            if (arg.type === TokenType.Identifier) {
                const variable = variables.find(variable => variable.name === arg.value);
                const returnVariable = functionsReturn.find(variable => variable.name === arg.value);

                if (!variable && !returnVariable) {
                    return sendError({
                        message: `${arg.value} not found`,
                        line,
                        column
                    });
                }

                if (variable && variable.isFunctionCall) {
                    const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));
                    value = functionFound?.returnValue!;
                }

                else {
                    value = variable?.value ?? returnVariable?.returnValue;
                }
            }

            stringValue = stringValue.replace('{}', value);
        }
    });

    console.log(stringValue);
}
