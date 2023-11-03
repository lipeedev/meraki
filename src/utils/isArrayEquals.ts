import { Token } from '../structures/Token';

export default function isArrayEquals(firstArray: Token[], secondArray: Token[]) {
    return firstArray.every((item, index) => item.value === secondArray[index].value && item.type === secondArray[index].type);
}
