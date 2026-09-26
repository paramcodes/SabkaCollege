import { db } from "../src/db";
import { insertSeedData } from "../src/db/seed/data";

await insertSeedData(db);

console.log("SabkaCollege development seed data inserted.");
