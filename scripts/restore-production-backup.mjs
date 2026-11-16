import { restoreProductionBackup } from "./production-backup.mjs";
if(process.argv.length!==4)throw Error("Usage: node scripts/restore-production-backup.mjs ARCHIVE NEW_INACTIVE_DIRECTORY");
try { console.log(JSON.stringify(await restoreProductionBackup(process.argv[2],process.argv[3]))); }
catch { console.error("Restore failed safely: check archive/key and use a new inactive directory. No active database was replaced.");process.exitCode=1; }
