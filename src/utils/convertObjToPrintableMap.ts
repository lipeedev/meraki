export function convertObjToPrintableMap<T>(obj: T): string {
    let result = '%(\n';
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = typeof obj[key] === 'string' ? `"${obj[key]}"` : obj[key];
            result += `  ${key}: ${value},\n`;
        }
    }
    result = result.slice(0, -2);
    result += '\n)';
    return result;
}
