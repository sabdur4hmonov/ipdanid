import { expect,test } from "vitest";
import { spawnSync } from "node:child_process";
test("preview launcher refuses unknown/path traversal names before any snapshot write",()=>{
 for(const name of ["../testable-web","../../tmp/data","arbitrary"]){
   const r=spawnSync(process.execPath,["scripts/start-testable-web.mjs","--name",name],{encoding:"utf8",windowsHide:true});
   expect(r.status).not.toBe(0);expect(r.stderr).toContain("Unknown preview snapshot");
 }
});
test("preview launcher refuses extra arguments rather than silently ignoring them",()=>{
 const r=spawnSync(process.execPath,["scripts/start-testable-web.mjs","--name","subject-repair","extra"],{encoding:"utf8",windowsHide:true});
 expect(r.status).not.toBe(0);expect(r.stderr).toContain("Expected --name subject-repair");
});
