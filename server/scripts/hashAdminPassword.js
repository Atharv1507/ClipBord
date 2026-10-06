// Makes the values for the admin login env vars.
//
//   node scripts/hashAdminPassword.js            # asks for the password (hidden)
//   printf '%s' "$PASS" | node scripts/hashAdminPassword.js   # or pipe it in
//
// The password is never taken as a command-line argument, because arguments
// end up in shell history and process lists.
// Paste the printed lines into server/.env and Railway -> Variables exactly as
// shown: no quotes needed. The $ signs in the hash are safe in both (dotenv and
// Railway don't expand them); just don't pass the hash through a shell export.

import crypto from "node:crypto";
import readline from "node:readline";
import { hashPass } from "../utils/hashPass.js";

const MIN_LENGTH = 12;

// Asks for input without echoing what's typed.
const askHidden = (question) =>
    new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = () => {};
        process.stdout.write(question);
        rl.question("", (answer) => {
            rl.close();
            process.stdout.write("\n");
            resolve(answer);
        });
    });

const readStdin = async () => {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, "");
};

const main = async () => {
    let password;
    if (process.stdin.isTTY) {
        password = await askHidden("Admin password: ");
        const again = await askHidden("Type it again: ");
        if (password !== again) throw new Error("The two passwords don't match");
    } else {
        password = await readStdin();
    }

    if (password.length < MIN_LENGTH) {
        throw new Error(`Use at least ${MIN_LENGTH} characters: the admin login has no second factor`);
    }

    const hash = await hashPass(password);
    console.log("\nAdd these to server/.env and Railway -> Variables:\n");
    console.log("ADMIN_EMAIL=<the email you'll log in with>");
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    // A fresh secret for signing admin sessions; keep it different from JWT_SECRET.
    console.log(`ADMIN_JWT_SECRET=${crypto.randomBytes(48).toString("hex")}`);
};

main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
});
