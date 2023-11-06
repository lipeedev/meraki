import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';
import { createInterface } from 'node:readline/promises';

const argsSize = 2;

export async function scan({ args, line, column, variables }: ModuleFunctionCallParams) {
    if (args.length !== argsSize) {
        sendError({
            message: `scan() takes exactly ${argsSize} argument (${args.length} given)`,
            line,
            column
        });
    }

    if (args[0].type !== TokenType.String && args[0].type !== TokenType.Identifier) {
        sendError({
            message: 'firs argument of scan() must be a string',
            line,
            column
        });
    }

    if (args[0].type === TokenType.Identifier) {
        const variable = variables.find(variable => variable.name === args[0].value);

        if (!variable) {
            return sendError({
                message: `variable "${args[0].value}" is not defined`,
                line: args[0].line,
                column: args[0].column
            });
        }

        if (variable.type !== TokenType.String) {
            sendError({
                message: `variable "${args[0].value}" must be a string`,
                line,
                column
            });
        }

        args[0].value = variable.value;
    }

    if (args[1].type !== TokenType.Identifier) {
        sendError({
            message: 'second argument of scan() must be a variable',
            line,
            column
        });
    }

    const variableToAssign = variables.find(variable => variable.name === args[1].value);

    if (!variableToAssign) {
        return sendError({
            message: `variable "${args[1].value}" is not defined`,
            line: args[1].line,
            column: args[1].column
        });
    }

    if (variableToAssign?.type !== TokenType.String) {
        sendError({
            message: `variable "${args[1].value}" must be a string`,
            line,
            column
        });
    }

    const readLine = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await readLine.question(args[0].value);

    variables[variables.indexOf(variableToAssign)].value = answer;
    readLine.close();

}
