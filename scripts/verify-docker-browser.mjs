import {chromium,devices,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://iprasm.localhost:5443',dir='output/phase14/docker';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--host-resolver-rules=MAP iprasm.localhost 127.0.0.1']});
const proof=[];
try{for(const name of ['desktop','mobile']){
 const context=await browser.newContext({...name==='mobile'?devices['Pixel 7']:{viewport:{width:1280,height:900}},ignoreHTTPSErrors:true});
 const page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('iprasm.locale','en'));await page.goto(base);
 const health=await page.evaluate(async()=>await(await fetch('/api/health')).json());expect(health.adminAuth).toBe('password');expect(health.sandbox).toBe(false);
 await page.getByTestId('customer-menu').locator('summary').click();await page.getByRole('button',{name:'Account / Admin',exact:true}).click();const hub=page.locator('.customer-hub');await hub.getByRole('button',{name:'Administration',exact:true}).click();
 const login=page.getByTestId('admin-password-login');await login.getByLabel('Administrator password',{exact:true}).fill('synthetic docker owner password');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/admin/login'));await login.getByRole('button',{name:'Sign in',exact:true}).click();const auth=await(await response).json();expect(auth.token).toHaveLength(43);await expect(page.getByTestId('owner-admin-navigation')).toBeVisible();
 const kits=page.getByTestId('kit-admin');await kits.getByLabel('Codes per batch',{exact:true}).fill('1');const batchResponse=page.waitForResponse(r=>r.url().endsWith('/api/admin/kits/batch'));await page.getByTestId('issue-kit-batch').click();const batch=await(await batchResponse).json();expect(batch.codes[0].quota).toBe(3);
 await page.screenshot({path:dir+'/'+name+'-production-admin.png',fullPage:true});
 await login.getByRole('button',{name:'Sign out of administration',exact:true}).click();await expect(page.getByTestId('owner-admin-navigation')).toHaveCount(0);
 const denied=await page.evaluate(async token=>(await fetch('/api/admin/session',{headers:{Authorization:'Bearer '+token}})).status,auth.token);expect(denied).toBe(403);
 await page.getByRole('button',{name:'Create',exact:true}).first().click();const menu=page.getByTestId('customer-menu');if(!await menu.evaluate(e=>e.open))await menu.locator('summary').click();await page.getByTestId('product-kind').selectOption('lettering');await page.getByTestId('lettering-input').fill('SALOM');await page.getByTestId('prepare-lettering').click();await expect(page.getByTestId('customer-adjust')).toBeVisible({timeout:30000});await page.getByRole('button',{name:'Create',exact:true}).last().click();await expect(page.getByTestId('customer-result')).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Start assembling',exact:true}).click();await page.getByTestId('kit-code').fill(batch.codes[0].code);await page.getByTestId('build-gate').getByRole('button',{name:'Sign in with kit code',exact:true}).click();await expect(page.getByTestId('kit-credits')).toContainText('3');await page.getByTestId('unlock-build').click();await expect(page.getByTestId('assembly-focus')).toBeVisible({timeout:30000});await page.getByTestId('assembly-confirm').click();await expect(page.getByTestId('confirmed-step')).toHaveText('1/3000');await page.screenshot({path:dir+'/'+name+'-production-kit-assembly.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);proof.push({viewport:name,realDockerHttps:true,selfSignedLocalTls:true,passwordLogin:true,adminLogoutRevokes:true,kitQuota:3,v3Generated3000:true,signedUnlock:true,confirmedStep:1});await context.close();
 }}finally{await browser.close();}
writeFileSync(dir+'/browser-report.json',JSON.stringify({cases:proof,liveDomainTested:false,ownerDataUsed:false},null,2));console.log(JSON.stringify({passed:proof.length,realDockerHttps:true,liveDomainTested:false}));
