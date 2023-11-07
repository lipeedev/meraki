import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSizeMinimum = 1;

export function create({ args, line, column, variables, functionsReturn }: ModuleFunctionCallParams) {
    if (args.length < argsSizeMinimum) {
        return sendError({
            message: `create() takes at least ${argsSizeMinimum} arguments`,
            line,
            column
        });
    }

    const values = [];

    for (const arg of args) {
        let valueToPush;

        if (arg.type === TokenType.Identifier) {
            const variable = variables.find(_var => _var.name === arg.value);
            const functionReturn = functionsReturn.find(functionReturn => functionReturn.name === arg.value);

            if (variable && variable.isFunctionCall) {
                const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));

                if (functionFound?.type === TokenType.Number) functionFound.returnValue = Number(functionFound.returnValue);

                valueToPush = functionFound?.returnValue!;
            }

            else if (variable) {
                if (variable.type === TokenType.Number) variable.value = Number(variable.value);
                valueToPush = variable.value;
            }

            else if (functionReturn) {
                if (functionReturn.type === TokenType.Number) functionReturn.returnValue = Number(functionReturn.returnValue);
                valueToPush = functionReturn.returnValue;
            }

            else {
                return sendError({
                    message: `Variable ${arg.value} not found`,
                    line: arg.line,
                    column: arg.column
                });
            }

        } else {
            valueToPush = arg.value;
            if (arg.type === TokenType.Number) valueToPush = Number(valueToPush);
        }

        if (!values.length) {
            values.push(valueToPush);
        }

        else if (typeof valueToPush !== typeof values[0]) {
            return sendError({
                message: 'all values must be of the same type',
                line: arg.line,
                column: arg.column
            });
        }

        else {
            values.push(valueToPush);
        }

    }

    return {
        type: TokenType.Array,
        returnValue: values
    };
}
