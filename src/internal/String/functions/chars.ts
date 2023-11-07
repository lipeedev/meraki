import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSize = 1;

export function chars({ args, line, column, variables, functionsReturn }: ModuleFunctionCallParams) {
    let value;

    if (args.length !== argsSize) {
        return sendError({
            message: `chars() takes exactly ${argsSize} argument (${args.length} given)`,
            line,
            column
        });
    }

    if (args[0].type !== TokenType.String && args[0].type !== TokenType.Identifier) {
        return sendError({
            message: 'chars() argument must be a string',
            line: args[0].line,
            column: args[0].column
        });
    }

    if (args[0].type === TokenType.Identifier) {
        const variable = variables.find(_var => _var.name === args[0].value);
        const functionReturn = functionsReturn.find(functionReturn => functionReturn.name === args[0].value);

        if (!variable && !functionReturn) {
            return sendError({
                message: `${args[0].value} not found`,
                line: args[0].line,
                column: args[0].column
            });
        }

        if (variable && variable.isFunctionCall) {
            const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));

            if (functionFound?.type !== TokenType.String) {
                return sendError({
                    message: 'chars() argument must be a string',
                    line: args[0].line,
                    column: args[0].column
                });
            }
            value = functionFound?.returnValue;
        }

        else if (variable?.type !== TokenType.String && functionReturn?.type !== TokenType.String) {
            return sendError({
                message: 'chars() argument must be a string',
                line: args[0].line,
                column: args[0].column
            });
        }

        else {
            value = variable?.value ?? functionReturn?.returnValue;
        }

    }
    else {
        value = args[0].value;
    }


    return {
        returnValue: Array.from(value),
        type: TokenType.Array
    };

}
