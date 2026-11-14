import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withFileLock } from "../utils.mjs";

test('锁占用或损坏时明确冲突，异常动作释放自己的锁', () => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'weiran4j-lock-'));
    try {
        const dir=path.join(root,'.local/locks');fs.mkdirSync(dir,{recursive:true});
        const file=path.join(dir,'scaffold.lock');fs.writeFileSync(file,'unrecognized lock');
        let executed=false;
        assert.throws(()=>withFileLock(root,'scaffold',()=>{executed=true;},20),(error)=>error.code==='CONFLICT');
        assert.equal(executed,false);assert.equal(fs.readFileSync(file,'utf8'),'unrecognized lock');
        fs.unlinkSync(file);
        assert.throws(()=>withFileLock(root,'scaffold',()=>{throw new Error('failure');}),/failure/);
        assert.equal(fs.existsSync(file),false);
    } finally {fs.rmSync(root,{recursive:true,force:true});}
});
