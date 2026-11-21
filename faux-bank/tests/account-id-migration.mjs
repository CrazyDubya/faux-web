/** Fresh, local-only D1 migration and ID-shape regression. No remote database. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const cli=process.env.WRANGLER_CLI??resolve(root,'node_modules/wrangler/bin/wrangler.js');
const state=mkdtempSync(join(tmpdir(),'fauxbank-migration-'));
function run(args){
 const result=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',timeout:30000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
 return result.stdout;
}
try{
 run(['d1','migrations','apply','fauxbank-db','--local','--persist-to',state]);
 const valid=['AA-AAAA-AAAAAAAA-AA','ZZ-ZZZZ-ZZZZZZZZ-ZZ'];
 const invalid=[
  'aa-AAAA-AAAAAAAA-AA','A1-AAAA-AAAAAAAA-AA','ÅA-AAAA-AAAAAAAA-AA',
  'AA-AAA-AAAAAAAA-AA','AA-AAAAA-AAAAAAAA-AA','AA-AAAA-AAAAAAA-AA',
  'AA-AAAA-AAAAAAAAA-AA','AA-AAAA-AAAAAAAA-A','AA-AAAA-AAAAAAAA-AAA',
  'AA_AAAA-AAAAAAAA-AA','AA-AAAA_AAAAAAAA-AA','AA-AAAA-AAAAAAAA_AA',
  'AA-AAAA-AAAA-AAA-AA','AA-AAAA-AAAA AAA-AA','AA-AAAA-AAAA!AAA-AA',
  'AA-AAAA-AAAAAAAA-AA ',' AA-AAAA-AAAAAAAA-AA','AA-AAAA-AAAAAAAA-Aa',
  'AA-AAAA-AAAAAAAA-A0','AA-AAAA-AAAAAAAA-Aé',
 ];
 const quote=text=>"'"+text.replaceAll("'","''")+"'";
 const sql=join(state,'fixtures.sql');
 writeFileSync(sql,valid.concat(invalid).map(id=>`INSERT OR IGNORE INTO accounts(id,type,segment,owner_id) VALUES(${quote(id)},'CH','RETL','SYSTEM');`).join('\n')+'\nSELECT id FROM accounts ORDER BY id;');
 const rows=JSON.parse(run(['d1','execute','fauxbank-db','--local','--persist-to',state,'--file',sql,'--json']));
 const selected=rows.flatMap(row=>row.results??[]).filter(row=>'id'in row).map(row=>row.id).sort();
 const seeds=['CH-COMM-SEEDBANK-AA','CH-COMM-FEEINCOM-BB','CH-COMM-INTEREST-CC','CH-COMM-EXTERNAL-DD'];
 assert.deepEqual(selected,seeds.concat(valid).sort());
 console.log(JSON.stringify({fresh_migration:true,original_seeds_preserved:4,valid_fixture_ids_accepted:valid.length,invalid_fixture_ids_rejected:invalid.length,ids:selected},null,2));
}finally{rmSync(state,{recursive:true,force:true});}
