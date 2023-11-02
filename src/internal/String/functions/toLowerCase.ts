import { TokenType } from "../../../structures/Token";
import { ModuleFunctionCallParams } from "../../../structures/Visitor";
import { sendError } from "../../../utils/sendError";

const argsSize = 1;

export function toLowerCase({ args, line, column }: ModuleFunctionCallParams) {
  if (args.length !== argsSize) {
    return sendError({
      message: `toLowerCase() takes exactly ${argsSize} argument (${args.length} given)`,
      line,
      column
    })
  }

  if (args[0].type !== TokenType.String) {
    return sendError({
      message: `toLowerCase() argument must be a string`,
      line: args[0].line,
      column: args[0].column
    })
  }

  return { returnValue: args[0].value.toLowerCase() }

}
