import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSize = 3;

export function replace({ args, line, column, variables }: ModuleFunctionCallParams) {
    if (args.length !== argsSize) {
        return sendError({
            message: `replace() takes exactly ${argsSize} arguments (${args.length} given)`,
            line,
            column
        });
    }

    if (args[0].type !== TokenType.String && args[0].type !== TokenType.Identifier) {
        return sendError({
            message: 'replace() argument 1 must be a string',
            line: args[0].line,
            column: args[0].column
        });
    }

    if (args[1].type !== TokenType.String && args[1].type !== TokenType.Identifier) {
        return sendError({
            message: 'replace() argument 2 must be a string',
            line: args[1].line,
            column: args[1].column
        });
    }

    if (args[2].type !== TokenType.String && args[2].type !== TokenType.Identifier) {
        return sendError({
            message: 'replace() argument 3 must be a string',
            line: args[2].line,
            column: args[2].column
        });
    }

    const string = args[0].type === TokenType.String ? args[0].value : variables.find(_var => _var.name === args[0].value)?.value;
    const search = args[1].type === TokenType.String ? args[1].value : variables.find(_var => _var.name === args[1].value)?.value;
    const replace = args[2].type === TokenType.String ? args[2].value : variables.find(_var => _var.name === args[2].value)?.value;

    if (!string) {
        return sendError({
            message: `String "${args[0].value}" not found`,
            line: args[0].line,
            column: args[0].column
        });
    }

    if (typeof search !== 'string') {
        return sendError({
            message: 'replace() argument 2 must be a string',
            line: args[1].line,
            column: args[1].column
        });
    }

    if (typeof replace !== 'string') {
        return sendError({
            message: 'replace() argument 3 must be a string',
            line: args[2].line,
            column: args[2].column
        });
    }


    return {
        returnValue: string.replace(search, replace),
        type: TokenType.String
    };

}
