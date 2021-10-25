const { closeInputStream, 
    handleUserInput, 
    handleUserDeadWoundedEntry } = require("./inputHandler");

const DeadAndWoundedSolver = require('./solver');


const generateCode = () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const sett = new Set();
    while (sett.size < 4) {
        let num = arr[Math.floor(Math.random() * 10)];
        sett.add(num);
    }
    return new Array(...sett).join("");
};

const evaluate = (code, input) => {
    const inputSplitted = input.split('');
    const result = {
        dead: 0,
        wounded: 0
    };

    inputSplitted.forEach((num, index) => {
        if (num == code[index]) {
            result.dead++;
            return;
        }
        if (code.includes(num)) result.wounded++;
    });
    return result;
};

async function main() {
    console.log("Die or Wound!!!");
    console.log("\n\nWhen inputting your guess,\ninput a 4-digit number with non-repeating digits");
    console.log("\n\nWhen responding to the machine's guess,\nfollow the prompt to enter the number of dead & wounded");
    console.log("Game start\n");
    
    const solver = new DeadAndWoundedSolver();
    const machineCode = generateCode();
    let machineInput = null;
    let machineDead = null;
    let machineWounded = null;

    let userInput = null;
    let gameOver = false;

    while (!gameOver) {
        userInput = await handleUserInput();
        let { dead, wounded } = evaluate(machineCode, userInput)
        console.log(`${dead} dead; ${wounded} wounded\n\n`);
        if (dead == 4) {
            console.log("You Win");
            break;
        }

        machineInput = (machineInput == null) ? solver.choose() : solver.evaluateResult(machineInput.value, machineDead, machineWounded);
        if (!machineInput.found) {
            console.log("Error;");
            break;
        }
        console.log(`Machine Guesses: ${machineInput.value}`);
        let result = await handleUserDeadWoundedEntry();
        if (result.dead == 4) {
            console.log("Machine Wins");
            break;
        }
        machineDead = result.dead;
        machineWounded = result.wounded;
    }
    closeInputStream();
}

main();