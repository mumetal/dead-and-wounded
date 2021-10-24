const readline = require('readline');

//#region Input Reader
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
//#endregion

class Sample {
    constructor(value) {
        this.value = value;
        this.set = new Set(value.split(''));
    }

    digitAt(index) {
        return this.value.charAt(index);
    }
}

class Guess {
    constructor(value, dead, wounded) {
        this.value = value;
        this.dead = dead;
        this.wounded = wounded;
        this.set = new Set();
        const sett = new Set();
        value.split('').forEach((num, idx) => {
            this.set.add(num);
            sett.add(`${num}${idx}`);
        })
        this.hash = sett;
    }

    digitAt(index) {
        return this.value.charAt(index);
    }
}

class DeadAndWoundedSolver {
    #allPossible = [];
    #z9 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    #universalSet = new Set();
    sampleSpace = [new Sample('0123')];
    guesses = [new Guess('0123', 0, 0)];
    confirmedDead = new Set();
    cursed = new Set();
    foundPosition = { 0: false, 1: false, 2: false, 3: false };
    foundNumber = { 0: null, 1: null, 2: null, 3: null };
    constructor() {
        this.#universalSet = new Set(this.#z9.map(x => x.toString()));
        this.#allPossible = this.combine([...this.#z9], 4);
        this.sampleSpace = this.#allPossible.map(x => { return new Sample(x); });
        this.possibleSet = {
            0: new Set(this.#z9.map(x => x.toString())),
            1: new Set(this.#z9.map(x => x.toString())),
            2: new Set(this.#z9.map(x => x.toString())),
            3: new Set(this.#z9.map(x => x.toString()))
        };
        this.guesses.pop();
    }

    reset() {
        this.sampleSpace = this.#allPossible.map(x => { return new Sample(x); });
        this.possibleSet = {
            0: new Set(this.#z9.map(x => x.toString())),
            1: new Set(this.#z9.map(x => x.toString())),
            2: new Set(this.#z9.map(x => x.toString())),
            3: new Set(this.#z9.map(x => x.toString()))
        };
        this.guesses = [];
        this.confirmedDead = new Set();
        this.cursed = new Set();
        this.foundPosition = { 0: false, 1: false, 2: false, 3: false };
        this.foundNumber = { 0: null, 1: null, 2: null, 3: null };
    }

    choose() {
        if (this.guesses.length == 0 && this.cursed.size < 4) return { found: true, value: '0123' };
        if (this.guesses.length == 1 && this.cursed.size < 4) return { found: true, value: '3456' };
        if (this.guesses.length == 2 && this.cursed.size < 4) return { found: true, value: '6789' };

        if (this.sampleSpace.length == 0) return { found: false, value: null };

        const chosen = this.selectBest();
        return { found: true, value: chosen.value };
    }

    evaluateResult(value, dead, wounded) {
        const currentGuess = new Guess(value, dead, wounded);
        this.guesses.push(currentGuess);

        this.sampleSpace = this.sampleSpace.filter(x => x.value != currentGuess.value);

        this.wipeOutPermutationsOfCurrentGuess(currentGuess);
        this.applyShrunkSampleToPossibleSet();
        this.checkSimilarGuesses();

        this.guesses.forEach(x => {
            this.filterOut(x);
        });

        this.applyShrunkSampleToPossibleSet();

        this.checkSimilarGuesses();


        this.guesses.forEach(x => {
            this.filterOut(x);
        });

        return this.choose();
    }

    filterOut(guess) {

        this.consecrateDead();
        this.applyCurses();

        let dead = guess.dead;
        let wounded = guess.wounded;
        let knownDead = 0;
        let knownWounded = 0;
        let woundedSet = new Set();
        let currentlyCursed = this.setIntersect(this.cursed, guess.set);
        for (const position in this.foundPosition) {
            if (this.foundNumber[position] == guess.digitAt(position)) {
                knownDead++;
            } else if (this.confirmedDead.has(guess.digitAt(position))) {
                knownWounded++;
                woundedSet.add(guess.digitAt(position));
            }
        }
        dead -= knownDead;
        wounded -= knownWounded;

        const valueSet = guess.set;
        const valuesExcludingDeadSet = this.setExcept(valueSet, this.confirmedDead);


        if (currentlyCursed.size > 0 && dead > 0 && wounded == 0) {
            const n = currentlyCursed.size + dead + wounded + knownDead + knownWounded;
            if (n == 4) {
                guess.value.split('').forEach((num, idx) => {
                    if (this.cursed.has(num) || this.confirmedDead.has(num)) return;
                    this.wipeOutOthersExceptNumInPositionIdx(num, idx);
                });
            }
            this.consecrateDead();
            this.applyCurses();
        }

        if (dead == 0 && wounded == 0) {
            for (const num of valuesExcludingDeadSet) {
                this.wipeOutNumForAllPositions(num)
            }
            return;
        }

        if (dead == 0 && wounded == valuesExcludingDeadSet.size) {

            guess.value.split('').forEach((num, idx) => {
                if (this.foundPosition[idx] && this.confirmedDead.has(num)) return;

                this.possibleSet[idx].delete(num);
                this.sampleSpace = this.sampleSpace.filter(x => x.digitAt(idx) != num);
            });

            this.wipeOutAllNotHavingSet(valuesExcludingDeadSet);
            return;
        }

        if (dead + wounded + knownDead + knownWounded == 4) {
            this.wipeOutAllNotHavingSet(valueSet);
        }

        if (dead == 0 && wounded > 0) {
            guess.value.split('').forEach((num, idx) => {
                if (this.foundPosition[idx] && this.confirmedDead.has(num)) return;

                this.possibleSet[idx].delete(num);
                this.sampleSpace = this.sampleSpace.filter(x => x.digitAt(idx) != num);
            });
            return;
        }

        if (dead > 0 && wounded == 0) {
            guess.value.split('').forEach((num, idx) => {
                if (this.foundPosition[idx] && this.confirmedDead.has(num)) return;

                const currentNumSet = new Set(); currentNumSet.add(num);
                let setToDelete = this.setExcept(valueSet, currentNumSet);
                setToDelete = this.setExcept(setToDelete, woundedSet);

                this.wipeOutNumSetInPosition(setToDelete, idx);
            });
            return;
        }
    }

    applyShrunkSampleToPossibleSet() {
        this.possibleSet[0] = new Set();
        this.possibleSet[1] = new Set();
        this.possibleSet[2] = new Set();
        this.possibleSet[3] = new Set();

        this.sampleSpace.forEach(x => {
            this.possibleSet[0].add(x.digitAt(0));
            this.possibleSet[1].add(x.digitAt(1));
            this.possibleSet[2].add(x.digitAt(2));
            this.possibleSet[3].add(x.digitAt(3));
        });
    }

    applyCurses() {
        for (const num of this.#universalSet) {
            if (
                !this.possibleSet[0].has(num) &&
                !this.possibleSet[1].has(num) &&
                !this.possibleSet[2].has(num) &&
                !this.possibleSet[3].has(num)
            ) {
                this.curse(num);
            }
        }
    }

    consecrateDead() {
        for (const position in this.possibleSet) {
            const possibleAtPosition = this.possibleSet[position];
            if (this.foundPosition[position]) continue;

            if (possibleAtPosition.size == 1) {
                this.foundPosition[position] = true;
                for (const item of possibleAtPosition) {
                    this.foundNumber[position] = item
                    this.confirmedDead.add(item);
                }
                this.wipeOutOthersExceptNumInPositionIdx(this.foundNumber[position], position);
            }
        }
    }

    wipeOutPermutationsOfCurrentGuess(guess) {
        const dw = guess.dead + guess.wounded + 1;
        if (dw < 4) {
            this.sampleSpace = this.sampleSpace.filter(x => {
                const intersectsize = this.setIntersect(guess.set, x.set).size;
                if (intersectsize >= dw) return false;
                return true;
            });
        }
    }

    wipeOutOthersExceptNumInPositionIdx(num, idx) {
        for (const position in this.possibleSet) {
            if (position == idx) {
                this.possibleSet[position].clear();
                this.possibleSet[position].add(num);
            } else {
                this.possibleSet[position].delete(num);
            }

        }
        this.sampleSpace = this.sampleSpace.filter(x => x.value.charAt(idx) == num);
    }

    wipeOutNumInPositionIdx(num, idx) {
        this.possibleSet[idx].delete(num);
        this.sampleSpace = this.sampleSpace.filter(x => x.digitAt(idx) != num);
    }

    wipeOutNumForAllPositions(num) {
        for (const position in this.possibleSet) {
            this.possibleSet[position].delete(num);
        }
        this.sampleSpace = this.sampleSpace.filter(x => !x.set.has(num));
        this.curse(num);
    }

    wipeOutAllNotHavingSet(numSet) {
        for (const position in this.possibleSet) {
            this.possibleSet[position] = this.setIntersect(this.possibleSet[position], numSet);
        }
        this.sampleSpace = this.sampleSpace.filter(x => this.setIntersect(x.set, numSet).size == numSet.size);
    }

    wipeOutAllNotHavingSetInPosition(numSet, position1, position2) {
        this.sampleSpace = this.sampleSpace
            .filter(x => {
                const cond1 = numSet.has(x.digitAt(position1));
                const cond2 = numSet.has(x.digitAt(position2));
                return cond1 || cond2;
            });
        this.applyShrunkSampleToPossibleSet();
    }

    wipeOutNumSetInPosition(numSet, position) {
        this.possibleSet[position] = this.setExcept(this.possibleSet[position], numSet);
        this.sampleSpace = this.sampleSpace.filter(x => !numSet.has(x.digitAt(position)));
    }

    wipeOutAllWithoutNum(num) {
        this.sampleSpace = this.sampleSpace.filter(x => x.set.has(num));
        this.applyShrunkSampleToPossibleSet();
    }



    selectBest() {
        const [chosen, ...rest] = this.sampleSpace;
        this.sampleSpace = rest;
        return chosen;
    }

    setIntersect(s1, s2) {
        let s3 = new Set();
        s1.forEach(element => {
            if (s2.has(element)) s3.add(element);
        });
        return s3;
    }

    setExcept(s1, s2) {
        let s3 = new Set();
        s1.forEach(element => {
            if (!s2.has(element)) s3.add(element);
        });
        return s3;
    }

    setUnion(s1, s2) {
        let s3 = new Set();
        s1.forEach(element => {
            s3.add(element);
        });
        s2.forEach(element => {
            s3.add(element);
        });
        return s3;
    }

    curse(num) {
        this.cursed.add(num);
    }

    checkSimilarGuesses() {
        const first = this.guesses[this.guesses.length - 1];

        for (let i = this.guesses.length - 2; i >= 0; i--) {
            const second = this.guesses[i];
            if (this.setIntersect(first.hash, second.hash).size == 3) {
                if (first.dead > second.dead) {
                    let numidx = null;
                    for (const item of this.setExcept(first.hash, second.hash)) numidx = item;
                    const num = numidx.charAt(0);
                    const idx = numidx.charAt(1);
                    this.wipeOutOthersExceptNumInPositionIdx(num, idx);
                    if (first.wounded < second.wounded) {
                        let snumidx = null;
                        for (const item of this.setExcept(second.hash, first.hash)) snumidx = item;
                        const snum = snumidx.charAt(0);
                        this.wipeOutAllWithoutNum(snum);
                    } else if (first.wounded == second.wounded) {
                        let snumidx = null;
                        for (const item of this.setExcept(second.hash, first.hash)) snumidx = item;
                        const snum = snumidx.charAt(0);
                        this.wipeOutNumForAllPositions(snum);
                    }
                } else if (second.dead > first.dead) {
                    let numidx = null;
                    for (const item of this.setExcept(second.hash, first.hash)) numidx = item;
                    const num = numidx.charAt(0);
                    const idx = numidx.charAt(1);
                    this.wipeOutOthersExceptNumInPositionIdx(num, idx);
                    if (second.wounded < first.wounded) {
                        let fnumidx = null;
                        for (const item of this.setExcept(first.hash, second.hash)) fnumidx = item;
                        const fnum = fnumidx.charAt(0);
                        this.wipeOutAllWithoutNum(fnum);
                    } else if (first.wounded == second.wounded) {
                        let fnumidx = null;
                        for (const item of this.setExcept(first.hash, second.hash)) fnumidx = item;
                        const fnum = fnumidx.charAt(0);
                        this.wipeOutNumForAllPositions(fnum);
                    }
                } else {
                    let fnumidx = null;
                    for (const item of this.setExcept(first.hash, second.hash)) fnumidx = item;
                    const fnum = fnumidx.charAt(0);
                    const fidx = fnumidx.charAt(1);
                    this.wipeOutNumInPositionIdx(fnum, fidx);

                    let snumidx = null;
                    for (const item of this.setExcept(second.hash, first.hash)) snumidx = item;
                    const snum = snumidx.charAt(0);
                    const sidx = snumidx.charAt(1);
                    this.wipeOutNumInPositionIdx(snum, sidx);

                    if (first.wounded > second.wounded) {
                        this.wipeOutNumForAllPositions(snum);
                    } else if (second.wounded > first.wounded) {
                        this.wipeOutNumForAllPositions(fnum);
                    }
                }
            }

            const cumu = first.dead + first.wounded + second.dead + second.wounded;
            if (cumu - this.setIntersect(first.set, second.set).size >= 4) {
                const union = this.setUnion(first.set, second.set);
                const deleton = this.setExcept(this.#universalSet, union);
                for (const num of deleton) {
                    this.wipeOutNumForAllPositions(num);
                }

            }

            if (this.setIntersect(first.set, second.set).size == 4 && first.dead != second.dead) {

                const position = {};
                first.value.split('').forEach((num, idx) => {
                    if (num == second.digitAt(idx)) return;
                    position[idx] = new Set();
                    position[idx].add(num);
                    position[idx].add(second.digitAt(idx));
                });
                const keys = Object.keys(position);
                if (Object.keys(position).length == 2) {
                    this.wipeOutAllNotHavingSetInPosition(position[keys[0]], keys[0], keys[1]);
                }

            }
        }
    }

    combine(arr, n) {
        const result = [];
        this.combineHelper(arr, n, result);
        return result;
    }

    combineHelper(arr, n, result, str = [], sett = new Set()) {
        if (n == 0) {
            result.push(str.join(""));
            return;
        }
        arr.filter(element => !sett.has(element))
            .forEach(element => {
                str.push(element);
                sett.add(element);

                this.combineHelper(arr, n - 1, result, str, sett);

                str.pop();
                sett.delete(element);
            });
    }
};


const generateCode = () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const sett = new Set();
    while (sett.size < 4) {
        let num = arr[Math.floor(Math.random() * 10)];
        sett.add(num);
    }
    return new Array(...sett).join("");
};

const validateInput = (code) => {
    if (code.match(/\d{4}/i) == null) return { valid: false, errMsg: "Pass 4 numbers" };
    if (new Set(code.split('')).size != 4) return { valid: false, errMsg: "The numbers passed must be distinct" };
    return { valid: true };
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
// handleUserDeadWoundedEntry()