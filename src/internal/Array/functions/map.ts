import { TokenType } from '../../../structures/Token';
import { ModuleFunctionCallParams, Variable, Visitor } from '../../../structures/Visitor';
import { sendError } from '../../../utils/sendError';

const argsSize = 2;

export async function map({ args, line, column, variables, functionsReturn, functionsDeclaration, importModules }: ModuleFunctionCallParams) {
    const firstArg = args[0];

    if (args.length !== argsSize) {
        return sendError({
            message: `map() expected ${argsSize} arguments, got ${args.length}`,
            line,
            column
        });
    }

    if (firstArg.type !== TokenType.Identifier) {
        return sendError({
            message: `map() expected an ${TokenType.Array} as first argument, got ${firstArg.type}`,
            line,
            column
        });
    }

    const variable = variables.find(variable => variable.name === firstArg.value);
    const functionReturn = functionsReturn.find(functionReturn => functionReturn.name === firstArg.value);

    if (variable && variable.isFunctionCall) {
        const functionFound = functionsReturn.find(functionReturn => functionReturn.name === variable.value && (functionReturn.variableFunction?.name === variable.name || functionReturn?.variableFunction?.references?.includes(variable.name)));
        firstArg.value = functionFound?.returnValue!;
        firstArg.type = functionFound?.type!;
    }

    else if (variable) {
        firstArg.value = variable.value;
        firstArg.type = variable.type!;
    }

    else if (functionReturn) {
        firstArg.value = functionReturn.returnValue;
        firstArg.type = functionReturn.type!;
    }

    else {
        return sendError({
            message: `${firstArg.value} not found`,
            line: firstArg.line,
            column: firstArg.column
        });
    }

    if (firstArg.type !== TokenType.Array) {
        return sendError({
            message: `map() expected an ${TokenType.Array} as first argument, got ${firstArg.type}`,
            line: firstArg.line,
            column: firstArg.column
        });
    }

    const secondArg = args[1];

    if (secondArg.type !== TokenType.Identifier) {
        return sendError({
            message: `map() expected a callback as second argument, got ${secondArg.type}`,
            line: secondArg.line,
            column: secondArg.column
        });
    }

    const functionDeclaration = functionsDeclaration.find(functionDeclaration => functionDeclaration.name === secondArg.value);

    if (!functionDeclaration) {
        return sendError({
            message: `"${secondArg.value}" not found`,
            line: secondArg.line,
            column: secondArg.column
        });
    }

    if (functionDeclaration?.args?.length !== 2) {
        return sendError({
            message: `map() callback expected 2 arguments, got ${functionDeclaration?.args?.length}`,
            line: secondArg.line,
            column: secondArg.column
        });
    }

    const arrayInput = firstArg.value as unknown as Array<any>;

    const arrayOutput = arrayInput.map(async (value, index: number) => {
        const types = {
            number: TokenType.Number,
            string: TokenType.String,
            boolean: TokenType.Boolean,
        };

        const parameterValue: Variable = {
            name: functionDeclaration?.args?.[0]?.value!,
            value,
            type: types[typeof value as keyof typeof types],
        };

        const parameterIndex: Variable = {
            name: functionDeclaration?.args?.[1]?.value!,
            value: index,
            type: TokenType.Number,
        };

        const visitor = new Visitor(functionDeclaration.body!, importModules, functionsDeclaration, [parameterValue, parameterIndex]);

        const { returnList: functionsReturnVisitor } = await visitor.visit();

        if (functionsReturnVisitor.length) {
            return functionsReturnVisitor[0].returnValue;
        }
    });

    const values = await Promise.all(arrayOutput);

    return {
        returnValue: values,
        type: TokenType.Array
    };


}
