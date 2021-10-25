const readline = require('readline');

const { readInputAsync, closeInputStream } = (function () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const getLine = (function () {
        const getLineGen = (async function* () {
            for await (const line of rl) {
                yield line;
            }
        })();
        return async () => ((await getLineGen.next()).value);
    })();

    const readInputAsync = async (prompt = null) => {
        if (prompt != null) console.log(prompt);
        return await getLine();
    };

    const closeInputStream = () => rl.close();

    return {
        readInputAsync,
        closeInputStream
    };
})();

const handleUserInput = async () => {
    console.log("\n");
    const prompt = "Enter your guess: ";
    let input = await readInputAsync(prompt);
    let {valid, errMsg} = validateInput(input);
    while (!valid) {
        console.log(errMsg);
        input = await readInputAsync(prompt);
        const result = validateInput(input);
        valid = result.valid;
        errMsg = result.errMsg;
    }
    return input;
}

const handleUserDeadWoundedEntry = async () => {
    console.log("\n");
    let dead = null;
    let wounded = null;
    while (true) {
        try {
            input = await readInputAsync("Enter dead: ");
            dead = Number(input);

            input = await readInputAsync("Enter wounded: ");
            wounded = Number(input);

            if (dead < 0) console.log("Dead cannot be negative.");
            if (wounded < 0) console.log("Wounded cannot be negative.");
            if (dead + wounded > 4) console.log("Dead + Wounded cannot be greater than 4");

            if (dead >= 0 && wounded >= 0 && dead + wounded <= 4) break;
        } catch (error) {
            console.log("Invalid entry, try again");
        }
    }
    return {dead, wounded};
}

const validateInput = (code) => {
    if (code.match(/\d{4}/i) == null) return { valid: false, errMsg: "Pass 4 numbers" };
    if (new Set(code.split('')).size != 4) return { valid: false, errMsg: "The numbers passed must be distinct" };
    return { valid: true };
};

module.exports = { 
    closeInputStream, 
    handleUserDeadWoundedEntry, 
    handleUserInput
};