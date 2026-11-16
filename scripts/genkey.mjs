// Prints two fresh random secrets. Run once: npm run genkey
import { randomBytes } from "node:crypto";

const make = () => randomBytes(32).toString("base64url");

console.log("ACCESS_KEY     (what you type to sign in; keep it in a password manager)");
console.log("  " + make());
console.log("SESSION_SECRET (server only; signs the session cookie)");
console.log("  " + make());
