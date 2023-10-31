import { Token, TokenType } from "../../../structures/Token";
import { Variable } from "../../../structures/Visitor";
import { sendError } from "../../../utils/sendError";

export function print(variables: Variable[], args: Token[]) {
  const valuesToPrint = []

  for (const arg of args) {
    if (arg.type === TokenType.Identifier) {
      const variable = variables.find(variable => variable.name === arg.value);

      if (!variable) {
        sendError({
          message: `Variable "${arg.value}" not found`,
          line: arg.line,
          column: arg.column
        });
      }

      valuesToPrint.push(variable?.value)
    }
    else {
      valuesToPrint.push(arg.value);
    }
  }

  console.log(...valuesToPrint);
}
