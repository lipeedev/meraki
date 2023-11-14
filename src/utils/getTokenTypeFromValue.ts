import { TokenType } from '../structures/Token';

export default function getTokenTypeFromValue(value: any) {
    const tokenTypeList = {
        string: TokenType.String,
        number: TokenType.Number,
        boolean: TokenType.Boolean
    };

    const typeTarget = typeof value;

    if (Array.isArray((value))) {
        return TokenType.Array;
    }

    if (typeTarget in tokenTypeList) {
        return tokenTypeList[typeTarget as keyof typeof tokenTypeList];
    }

    return null;
}
