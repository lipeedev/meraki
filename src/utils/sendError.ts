type sendErrorParams = {
  message: string,
  line: number,
  column: number
}

export function sendError({ message, line, column }: sendErrorParams) {
    console.log(`ERROR: ${message} [${line}:${column}]`);
    console.log('Exiting...');
    process.exit(1);
}
