
import { runChecklist } from "./slices/checklist/ops.js";

async function main() {
    console.log("Running Checklist Verification...");
    const report = await runChecklist(process.cwd(), { rigorous: true });
    console.log(JSON.stringify(report, null, 2));
}

main();
