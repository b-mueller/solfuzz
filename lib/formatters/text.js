const separator = '-'.repeat(20);
const indent = ' '.repeat(4);

const roles = {
    creator: 'CREATOR',
    attacker: 'ATTACKER',
    other: 'USER'
};

const textFormatter = {};

textFormatter.strToInt = str => parseInt(str, 10);

textFormatter.guessAccountRoleByAddress = (address) => {
    const prefix = address.toLowerCase().substr(0, 10);

    if (prefix === '0xaffeaffe') {
        return roles.creator;
    } else if (prefix === '0xdeadbeef') {
        return roles.attacker;
    }

    return roles.other;
};

textFormatter.stringifyValue = (value) => {
    const type = typeof value;

    if (type === 'number') {
        return Int(value);
    } else if (type === 'string') {
        return value;
    } else if (value == null) {
        return 'null';
    }

    return JSON.stringify(value);
};

textFormatter.formatTestCaseSteps = (steps, fnHashes) => {
    const output = [];

    for (let s = 0, n = 0; s < steps.length; s++) {
        const step = steps[s];

        /**
         * Empty address means "contract creation" transaction.
         *
         * Skip it to not spam.
         */
        if (step.address === '') {
            continue;
        }

        n++;

        const type = textFormatter.guessAccountRoleByAddress(step.origin);

        const fnHash = step.input.substr(2, 8);
        const fnName = fnHashes[fnHash] || step.name || '<N/A>';
        const fnDesc = `${fnName} [ ${fnHash} ]`;

        let decodedInput = "DECODING FAILED :( RAW CALLDATA: " + textFormatter.stringifyValue(step.input);

        if ('decodedInput' in step) {
            decodedInput = step.decodedInput;            
        }

        output.push(
            indent + `${n}: ${decodedInput}`,
            indent + `Sender: ${step.origin} [ ${type} ]`,
            indent + `Value: ${parseInt(step.value)}`,
            ''
        );

    }

    return output.join('\n').trimRight();
};

textFormatter.formatTestCase = (testCase, fnHashes) => {
    const output = [];

    if (testCase.steps) {
        const content = textFormatter.formatTestCaseSteps(
            testCase.steps,
            fnHashes
        );

        if (content) {
            output.push('Call sequence:', '', content);
        }
    }

    return output.length ? output.join('\n') : undefined;
};

textFormatter.getCodeSample = (source, src) => {
    const [start, length] = src.split(':').map(textFormatter.strToInt);

    return source.substr(start, length);
};

textFormatter.formatLocation = message => {
    const start = message.line + ':' + message.column;
    const finish = message.endLine + ':' + message.endCol;

    return 'from ' + start + ' to ' + finish;
};

textFormatter.formatMessage = (message, filePath, sourceCode, fnHashes) => {
    const { mythxIssue, mythxTextLocations } = message;
    const output = [];

    const code = mythxTextLocations.length
        ? textFormatter.getCodeSample(
            sourceCode,
            mythxTextLocations[0].sourceMap
        )
        : undefined;

    output.push(
        separator,
        'ASSERTION VIOLATION!',
        filePath  + ': ' + textFormatter.formatLocation(message),
        '',
        code || '<code not available>'
    );

    const testCases = mythxIssue.extra && mythxIssue.extra.testCases;

    if (testCases) {
        for (const testCase of testCases) {
            const content = textFormatter.formatTestCase(testCase, fnHashes);

            if (content) {
                output.push(separator, content);
            }
        }
    }

    return output.join('\n');
};

textFormatter.formatResult = result => {
    const { filePath, sourceCode, functionHashes } = result;

    return result.messages
        .map(
            message => textFormatter.formatMessage(
                message,
                filePath,
                sourceCode,
                functionHashes
            )
        )
        .join('\n\n');
};

textFormatter.run = results => {
    return results
        .map(result => textFormatter.formatResult(result))
        .join('\n\n');
};

module.exports = results => textFormatter.run(results);
