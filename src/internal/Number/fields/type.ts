import { TokenType } from '../../../structures/Token';

export const type = {
    value: `<${Buffer.from('type').toString('hex')}_number>`,
    type: TokenType.Number,
};
