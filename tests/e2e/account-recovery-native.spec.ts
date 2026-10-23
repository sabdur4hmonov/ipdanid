import {test,expect} from '@playwright/test';
import {generate} from '../../src/core/engine';
import {createProfile} from '../../src/core/geometry';
test.use({trace:'off'});
test('native-mode login restores a paid guide and exact rest cursor with a new device receipt and no second credit',async({page,request},info)=>{
  const api=process.env.IP_RASM_TEST_API_URL!+'/api';
  const email=crypto.randomUUID()+'@example.invalid',password='Synthetic-password-123!';
  const guest=await(await request.post('/api/session')).json();
  const registered=await request.post('/api/account/register',{headers:{Authorization:'Bearer '+guest.token},data:{email,password}});
  expect(registered.ok()).toBe(true);const account=await registered.json(),headers={Authorization:'Bearer '+account.token};
  const issued=await request.post('/api/admin/codes',{headers:{Authorization:'Bearer '+process.env.LOCAL_ADMIN_TOKEN!},data:{profile:'dev-circle-120-dark',quota:3,expiresAt:Date.now()+60000}});
  expect(issued.ok()).toBe(true);expect((await request.post('/api/codes/redeem',{headers,data:{code:(await issued.json()).code}})).ok()).toBe(true);
  const instruction=await generate({pixels:new Uint8Array(32*32*3).fill(90),resolution:32,profile:createProfile('circle',48),lines:40,mode:'dark',accessPolicy:'kit-build/1'});
  const paid=await request.post('/api/builds/unlock',{headers,data:{sequenceHash:instruction.sequenceHash,deviceId:'original-web-device-123',requestKey:crypto.randomUUID()}});
  expect(paid.ok()).toBe(true);const original=await paid.json();expect(original.credits).toBe(2);
  const archive=await request.post('/api/builds/archive',{headers,data:{instruction}});expect(archive.ok()).toBe(true);const id=(await archive.json()).instructionId;
  const body={sequenceHash:instruction.sequenceHash,confirmed:4,expectedRevision:0,requestKey:crypto.randomUUID(),resume:{current:17,pace:8,resting:true},library:{name:'Paid native restore',folder:'Gifts',bookmarks:[{step:12,label:'Check tension'}]}};
  expect((await request.post(`/api/instructions/${id}/recovery`,{headers,data:body})).ok()).toBe(true);
  await page.addInitScript(({api})=>{
    const w=window as any;w.CapacitorCustomPlatform={name:'native-test'};w.__nativeRecoveryCalls=[];
    w.Capacitor={PluginHeaders:[{name:'CapacitorHttp',methods:[{name:'request',rtype:'promise'}]},{name:'Preferences',methods:['get','set','remove'].map(name=>({name,rtype:'promise'}))}],
      nativePromise:async(plugin:string,method:string,o:any)=>{
        if(plugin==='Preferences'){
          const key='native-test:'+o.key;
          if(method==='get')return{value:localStorage.getItem(key)};
          if(method==='set'){if(w.__failProjectWrite && o.key==='iprasm.projects.v1')throw Error('Injected storage full');localStorage.setItem(key,o.value);return;}
          if(method==='remove'){localStorage.removeItem(key);return;}
        }
        if(plugin!=='CapacitorHttp'||method!=='request'||!o.url.startsWith(api+'/'))throw Error('Unexpected native transport');
        w.__nativeRecoveryCalls.push({path:o.url.slice(api.length),method:o.method,authorized:!!o.headers?.Authorization});
        const r=await fetch(o.url,{method:o.method,headers:o.headers,...(o.data===undefined?{}:{body:JSON.stringify(o.data)})});
        return {status:r.status,data:await r.json(),headers:{},url:o.url};
      }};
    localStorage.setItem('iprasm.debug-server.v1',api);localStorage.setItem('iprasm.locale','en');
  },{api});
  await page.goto('/');await page.getByTestId('customer-menu').locator('summary').click();
  await page.getByTestId('customer-menu').getByRole('button',{name:'Account / Admin',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password (at least 12 characters)',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByTestId('customer-credits')).toHaveText('2');
  await page.getByRole('button',{name:'Project sync',exact:true}).click();const panel=page.getByTestId('account-recovery');
  await panel.getByRole('button',{name:'Refresh from server',exact:true}).click();
  await page.evaluate(()=>{(window as any).__failProjectWrite=true;});
  await panel.getByRole('button',{name:'Restore server copy',exact:true}).click();await expect(panel).toContainText('Not saved');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('native-test:iprasm.projects.v1')??'[]'))).toEqual([]);
  await page.evaluate(()=>{(window as any).__failProjectWrite=false;});
  await panel.getByRole('button',{name:'Restore server copy',exact:true}).click();
  await expect(page.getByTestId('build-gate')).toBeVisible();await expect(page.getByTestId('player-hash')).toHaveCount(0);
  await page.getByTestId('unlock-build').click();await expect(page.getByTestId('build-gate')).toHaveCount(0);
  await expect(page.getByTestId('player-hash')).toHaveText(instruction.sequenceHash);await expect(page.getByTestId('confirmed-step')).toHaveText('4/40');
  await expect(page.getByTestId('assembly-rest-status')).toBeVisible();
  const restored=await page.evaluate(()=>({session:JSON.parse(localStorage.getItem('native-test:iprasm.assembly-session.v1')!),projects:JSON.parse(localStorage.getItem('native-test:iprasm.projects.v1')!),calls:(window as any).__nativeRecoveryCalls}));
  expect(restored.session).toMatchObject({current:17,resting:true,projectId:restored.projects[0].id});
  expect(restored.projects[0].instruction).toEqual(instruction);expect(restored.projects[0].folder).toBe('Gifts');
  expect(restored.calls).toEqual(expect.arrayContaining([expect.objectContaining({path:'/account/login',method:'POST'}),expect.objectContaining({path:'/builds/unlock',authorized:true})]));
  const state=await(await request.get('/api/builds/account',{headers})).json();expect(state.credits).toBe(2);expect(state.unlocks).toHaveLength(1);
  const privateCache=await page.evaluate(()=>Object.entries(localStorage).find(([key])=>key.startsWith('native-test:') && key.endsWith(':build-access-v1'))?.[1]);
  const receipt=JSON.parse(privateCache!).receipts[instruction.sequenceHash];
  expect(receipt.payload.deviceId).not.toBe('original-web-device-123');expect(receipt.payload.accountId).toBe(account.id);
  await page.reload();await expect(page.getByTestId('player-hash')).toHaveText(instruction.sequenceHash);await expect(page.getByTestId('assembly-rest-status')).toBeVisible();
  await page.getByTestId('assembly-focus').screenshot({path:`test-results/c21b-native/${info.project.name}-paid-restored.png`});
});
