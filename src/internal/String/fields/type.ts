import { TokenType } from "../../../structures/Token";

export const type = {
  value: `<${Buffer.from('type').toString('hex')}_string>`,
  type: TokenType.String,
}
