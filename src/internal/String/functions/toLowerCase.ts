import { TokenType } from "../../../structures/Token";
import { ModuleFunctionCallParams } from "../../../structures/Visitor";
import { sendError } from "../../../utils/sendError";

const argsSize = 1;

export function toLowerCase({ args, line, column, variables }: ModuleFunctionCallParams) {
  let value;

  if (args.length !== argsSize) {
    return sendError({
      message: `toLowerCase() takes exactly ${argsSize} argument (${args.length} given)`,
      line,
      column
    })
  }

  if (args[0].type !== TokenType.String && args[0].type !== TokenType.Identifier) {
    return sendError({
      message: `toLowerCase() argument must be a string`,
      line: args[0].line,
      column: args[0].column
    })
  }

  if (args[0].type === TokenType.Identifier) {
    const variable = variables.find(_var => _var.name === args[0].value)
    if (!variable) {
      return sendError({
        message: `Variable ${args[0].value} not found`,
        line: args[0].line,
        column: args[0].column
      })
    }

    if (variable.type !== TokenType.String) {
      return sendError({
        message: `toLowerCase() argument must be a string`,
        line: args[0].line,
        column: args[0].column
      })
    }

    value = variable.value;
  }
  else {
    value = args[0].value;
  }


  return {
    returnValue: value.toLowerCase(),
    type: TokenType.String
  }

}
