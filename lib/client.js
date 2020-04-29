const mythx = require('mythxjs');
const utils = require('./utils');

const getRequestData = (input, compiledData, fileName, args) => {
    /* Format data for MythX API */
    const data = {
        contractName: compiledData.contractName,
        bytecode: utils.replaceLinkedLibs(compiledData.contract.evm.bytecode.object),
        sourceMap: compiledData.contract.evm.bytecode.sourceMap,
        deployedBytecode: utils.replaceLinkedLibs(compiledData.contract.evm.deployedBytecode.object),
        deployedSourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        sourceList: [],
        analysisMode: args.mode,
        sources: {}
    };

    for (const key in compiledData.compiled.sources) {
        const ast = compiledData.compiled.sources[key].ast;
        const source = input.sources[key].content;

        data.sourceList.push(key);

        data.sources[key] = { ast, source };
    }

    data.mainSource = fileName;

    return data;
};

const failAnalysis = (reason, status) => {
    throw new Error(
        reason +
        ' ' +
        'The analysis job state is ' +
        status.toLowerCase() +
        ' and the result may become available later.'
    );
};

const awaitAnalysisFinish = async (client, uuid, initialDelay, timeout) => {
    const statuses = [ 'Error', 'Finished' ];

    let state = await client.getAnalysisStatus(uuid);

    if (statuses.includes(state.status)) {
        return state;
    }

    const timer = interval => new Promise(resolve => setTimeout(resolve, interval));

    const maxRequests = 10;
    const start = Date.now();
    const remaining = Math.max(timeout - initialDelay, 0);
    const inverted = Math.sqrt(remaining) / Math.sqrt(285);

    for (let r = 0; r < maxRequests; r++) {
        const idle = Math.min(
            r === 0 ? initialDelay : (inverted * r) ** 2,
            start + timeout - Date.now()
        );

        await timer(idle);

        if (Date.now() - start >= timeout) {
            failAnalysis(
                `User or default timeout reached after ${timeout / 1000} sec(s).`,
                state.status
            );
        }

        state = await client.getAnalysisStatus(uuid);

        if (statuses.includes(state.status)) {
            return state;
        }
    }

    failAnalysis(
        `Allowed number (${maxRequests}) of requests was reached.`,
        state.status
    );
};

const initialize = (apiUrl, username, password, apiKey) => {
    return new mythx.Client(username, password, undefined, apiUrl, apiKey);
};

const authenticate = async (client) => {
    return await client.login();
};

const submitDataForAnalysis = async(client, data) => {
    return await client.analyze(data, propertyChecking = true);
};

const getReport = async (client, uuid) => {
    return await client.getDetectedIssues(uuid);
};

const getAnalysesList = async (client) => {
    return await client.getAnalysesList();
};

const getAnalysisStatus = async(client, uuid) => {
    return await client.getAnalysisStatus(uuid);
};

module.exports = {
    initialize,
    authenticate,
    awaitAnalysisFinish,
    submitDataForAnalysis,
    getReport,
    getRequestData,
    getAnalysesList,
    getAnalysisStatus
};
