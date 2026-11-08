import { test,expect } from '../support/fixtures.js';
import { buildTree } from '../../client/src/features/ledger/merkle.js';
import { sampleReceipts } from '../../client/src/features/ledger/sampleReceipts.js';

const contract=`0x${'12'.repeat(20)}`,hash=`0x${'34'.repeat(32)}`,token='a'.repeat(64);
const identity={chainId:84532,contract,publisher:`0x${'56'.repeat(20)}`,deployHash:hash,deployBlock:1,deployBlockHash:hash};
const next=page=>page.getByRole('button',{name:/^Next/});
const receipt={id:'DON-2611-0001',type:'donation',amount:25,currency:'USD',date:'2026-11-08',ref:'donor-sample',status:'COMPLETED',batchId:null};
const tx={hash,blockNumber:123,blockHash:hash,timestamp:1794096000,from:identity.publisher,to:contract,gasUsed:100,feeEth:'0.00001',status:'success'};

test('staff publication resumes the saved job after reload without storing credentials',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const {root}=await buildTree([receipt]);
  let job=null; const writes=[];
  await page.route('**/api/ledger/status',r=>r.fulfill({json:{ok:true,...identity,local:false,network:'Base Sepolia · test ETH',publicationMode:'staff',pendingCount:job?0:1,activeJob:job}}));
  await page.route('**/api/ledger/batches/*',r=>{
    const url=new URL(r.request().url()); expect(url.searchParams.get('chainId')).toBe('84532');expect(url.searchParams.get('contract')).toBe(contract);
    return r.fulfill({json:{batch:null,identity}});
  });
  await page.route('**/api/paypal/receipts',r=>r.fulfill({json:{receipts:[receipt],poolDollars:25,pendingCount:job?0:1}}));
  await page.route('**/api/ngo/unlock',r=>{
    expect(r.request().postDataJSON()).toEqual({approver:'admin',pin:'synthetic-admin-pin'});
    return r.fulfill({json:{token,role:'admin',expiresAt:Date.now()+60_000,dashboard:{}}});
  });
  await page.route('**/api/ledger/publish-live',r=>{
    writes.push(r.request().url());expect(r.request().headers().authorization).toBe(`Bearer ${token}`);
    job={id:'JOB-12345678-1234-1234-1234-123456789abc',kind:'live',state:'submitted',hash,chainId:84532,contract,
      input:{batchId:101,root,donated:25,rewarded:0,paidOut:0,receipts:1},receipts:[receipt],result:null};
    return r.fulfill({status:202,json:{job,identity}});
  });
  await page.route('**/api/ledger/jobs/*/resume',r=>{
    writes.push(r.request().url());expect(r.request().headers().authorization).toBe(`Bearer ${token}`);
    const batch={...job.input,publishedAt:1,tx,identity};job={...job,state:'confirmed',result:batch};
    return r.fulfill({json:{job,identity,batch,receipts:[receipt]}});
  });
  const openLive=async()=>{await page.goto('/soon/impact');for(let i=0;i<3;i++)await next(page).click();};
  const unlock=async()=>{
    const input=page.getByLabel('NGO admin PIN',{exact:true});await input.fill('synthetic-admin-pin');
    await page.getByRole('button',{name:'Unlock publishing',exact:true}).click();await expect(input).toHaveCount(0);
  };
  await openLive();await expect(page.getByRole('note')).toContainText('Base Sepolia');
  const publish=page.getByRole('button',{name:'Publish 1 PayPal receipt to the blockchain',exact:true});
  await expect(publish).toBeDisabled();expect(writes).toHaveLength(0);
  await page.getByRole('banner').getByRole('button',{name:'हिन्दी',exact:true}).click();
  await expect(page.getByLabel('NGO एडमिन PIN',{exact:true})).toBeVisible();
  await page.getByRole('banner').getByRole('button',{name:'English',exact:true}).click();
  expect(writes).toHaveLength(0);
  await unlock();await publish.click();await expect(page.getByText(/saved and waiting for confirmation/)).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage))).not.toMatch(/synthetic-admin-pin|a{64}/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await openLive();await expect(page.getByText(job.id,{exact:true})).toBeVisible();
  const resume=page.getByRole('button',{name:'Check saved publication',exact:true});await expect(resume).toBeDisabled();
  await unlock();await resume.click();
  await expect(page.locator('.verify-result')).toContainText('matches the blockchain');
  await expect(page.getByRole('link',{name:/0x34343434/})).toHaveAttribute('href',`https://sepolia.basescan.org/tx/${hash}`);
  expect(writes).toHaveLength(2);expect(writes[1]).toContain(`${job.id}/resume`);
});

test('public verification rejects a proof scoped to a different contract',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const {root}=await buildTree(sampleReceipts);
  await page.route('**/api/ledger/status',r=>r.fulfill({json:{ok:true,...identity,publicationMode:'staff',network:'Base Sepolia · test ETH'}}));
  await page.route('**/api/ledger/batches/*',r=>r.fulfill({json:{identity,batch:{batchId:1,root,publishedAt:1,tx,
    identity:{...identity,contract:`0x${'99'.repeat(20)}`}}}}));
  await page.goto('/soon/impact');await next(page).click();await next(page).click();
  await page.getByRole('button',{name:'Verify',exact:true}).click();
  await expect(page.getByText('This proof belongs to a different chain or contract. Refresh the ledger before verifying it.')).toBeVisible();
  await expect(page.locator('.verify-result')).toContainText('Doesn’t match');
});

test('an older pending receipt still offers publication when the visible receipt is already published',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/ledger/status',r=>r.fulfill({json:{ok:true,chainId:31337,local:true,publicationMode:'local'}}));
  await page.route('**/api/ledger/batches/*',r=>r.fulfill({json:{batch:null}}));
  await page.route('**/api/paypal/receipts',r=>r.fulfill({json:{receipts:[{...receipt,batchId:101}],pendingCount:1,poolDollars:25}}));
  await page.goto('/soon/impact');for(let i=0;i<3;i++)await next(page).click();
  await expect(page.getByRole('button',{name:'Publish 1 PayPal receipt to the blockchain',exact:true})).toBeEnabled();
});

test('receipt history loads older pages without changing publication and translates its controls', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const reads = [];
  await page.route('**/api/ledger/status', route => route.fulfill({json:{ok:true,chainId:31337,local:true,publicationMode:'local'}}));
  await page.route('**/api/ledger/batches/*', route => route.fulfill({json:{batch:null}}));
  await page.route('**/api/paypal/receipts*', route => {
    const before = new URL(route.request().url()).searchParams.get('before');
    reads.push(before);
    return route.fulfill({json:{receipts:before
      ? [{...receipt,id:'DON-2610-9998',batchId:101},{...receipt,id:'DON-2610-9999',batchId:101}]
      : [{...receipt,batchId:101}], nextCursor:before?null:receipt.id, pendingCount:0, poolDollars:25}});
  });
  await page.goto('/soon/impact');
  for (let index=0;index<3;index++) await next(page).click();
  await expect(page.getByText('Receipts shown: 1.', {exact:true})).toBeVisible();
  await page.getByRole('banner').getByRole('button',{name:'हिन्दी',exact:true}).click();
  await page.getByRole('button',{name:'पुरानी रसीदें देखें',exact:true}).click();
  await expect(page.getByTestId('live-receipts').locator('tbody tr')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'पुरानी रसीदें देखें',exact:true})).toHaveCount(0);
  await page.getByRole('banner').getByRole('button',{name:'English',exact:true}).click();
  await expect(page.getByText('Receipts shown: 3.', {exact:true})).toBeVisible();
  expect(reads).toEqual([null,receipt.id]);
});
