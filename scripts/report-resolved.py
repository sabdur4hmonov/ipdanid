"""Private local report: real source and complete executable sequences, never overlays."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,html,re
import pdfplumber
f=Path('output/portrait-resolved')
audit=json.loads((f/'integrity.json').read_text())
comparison=json.loads((f/'comparison.json').read_text())
rows=audit['rows'];by={r['name']:r for r in rows}
bounds=json.loads((f/'source-regions.json').read_text())['bounds']
for name in ['original','candidate-target']:
 im=Image.open(f/(name+'-512.png'))
 for key,b in bounds.items():
  im.crop((b['left'],b['top'],b['right']+1,b['bottom']+1)).save(f/(name+'-'+key+'-512.png'))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
hero=Image.new('RGB',(1020,425),'#faf8f1');d=ImageDraw.Draw(hero)
for col,(name,label) in enumerate([('original','Original source crop'),('control','Preserved 160 reference'),('candidate-pruned','New 320 / same 0.1 mm thread')]):
 x=15+col*340;d.text((x,15),label,font=font,fill='#173f35')
 hero.paste(Image.open(f/(name+'-512.png')).convert('RGB').resize((320,320),Image.Resampling.LANCZOS),(x,55))
d.text((15,390),'Sequence-only results. Nose volume, lip separation and crossing texture remain imperfect.',font=small,fill='#333')
hero.save(f/'before-after.png')
def esc(x):return html.escape(str(x))
def table(headers,body):return '<div class="scroll"><table><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(c)+'</td>' for c in row)+'</tr>' for row in body)+'</tbody></table></div>'
def image(name,label,width=160):return f'<figure><img src="{name}.png" alt="{esc(label)}" style="width:{width}px;max-width:100%"><figcaption>{esc(label)}</figcaption></figure>'
content='''<h1>Portret / same-material 320 sampling checkpoint</h1><p>2026-10-11. <strong>Qualified improvement on this one portrait; quality acceptance remains open.</strong> The eight-sweep result has cleaner eyes, a clearer nose base and lip line at common 320/512 inspection. Nose volume, nostril distinction, upper/lower lip separation and crossing texture remain imperfect. Four sweeps were weaker. This is not a universal portrait or physical-assembly acceptance.</p><p><a href="http://127.0.0.1:4190/">Test the current website</a> · <a href="selected.json" download>Import selected project (zero progress)</a> · <a href="selected.txt" download>Exact instruction TXT</a> · <a href="selected-guide.pdf">Complete UZ PDF</a> · <a href="../mobile/ip-rasm-portrait-resolved-debug.apk" download>Android debug APK (not device-tested)</a></p><p>In the website choose My projects → Import project and select the downloaded JSON. All exports/player must identify hash <code>480cd9a0…b11a15</code>. Prior projects/progress remain intact. Reuse settings on that imported guide to retain its240-pin0.1mm320 profile. For another photo, choose Advanced photo → Portrait optimization → experimental circular pin basis, then Computation resolution320. Check Dimensions and materials under Advanced generation. Defaults remain unchanged.</p><h2>Ordinary display: identical 160px scale</h2><div class="row">'''
for name,label in [('original','Untouched original crop'),('candidate-target','Processed target'),('control','Preserved 160'),('candidate-4','320 / four sweeps'),('candidate','320 / eight sweeps'),('candidate-pruned','Separate pruned guide')]:content+=image(name+'-512',label)
content+='</div><h2>Enlarged / same common 512 reference</h2><img class="hero" src="before-after.png" alt="Source and both exact sequence reconstructions"><div class="row">'+image('regions-320','Corrected manual regions on direct-source 320 target',320)+'</div>'
for key,title in [('eyes','Both actual eyes'),('nose','Actual nose / nostrils'),('mouth','Actual upper/lower lips')]:
 content+=f'<h2>{title}</h2><div class="row">'
 for name,label in [('original','Original'),('candidate-target','Processed target'),('control','Preserved 160'),('candidate-4','320 / four'),('candidate','320 / eight'),('candidate-pruned','Pruned')]:
  content+=image(name+'-'+key+'-512',label,320)
 content+='</div>'
content+='''<h2>Decision and controlled settings</h2><p>Keep the eight-sweep unsimplified reference. Prefer the separately hashed 128-proposal simplification for this guide: two accepted removals save two connections, 1.546 m and an estimated 16 seconds. Face, each eye, nose, lips, jaw and light-skin pixels are exactly unchanged at all three common grids; full portraits were inspected. No accumulated tolerance, repetition-based removal or minimum-work claim. Regions use normalized processed-target sample centers, remapped from the original crop; manual boxes are not face detection.</p><p>Original source SHA-256 b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4. Same pre-existing locally prepared white PNG a6d3e0357d6a370a3f22a2f999d637c66f3378d8bf3bafa5fd3d6dc1fe207059. Exact old 160 target reproduced; new target is freshly sampled from that prepared original, never enlarged from 160. Source, crop, preprocessing settings, corrected regions, 400 mm board, 0.1 mm thread, opacity 0.85, unrotated 240 pins and safeguards stay unchanged. A fresh empty graph and genuine saved four/eight-sweep states are used; a fit graph is not an assembly instruction. Each executable sequence includes all routing strands.</p><p><strong>Confounds:</strong> unchanged preprocessing settings round local blur radius to 6 at160 and13 at320 (15.09 versus16.30 mm); background blur is32.70 versus32.60 mm. Pixel mask inclusion and bilinear optical deposition support also change with sampling. Physical contrast distances stay 400/159 ×[1,2,4] mm; fractional offsets at320 use319/159 ×[1,2,4], with interpolation and pixel-center x/y scale. This is a sampling/discretization experiment, not a perfectly isolated resolution-only objective or new physical material. Common-grid evaluation uses the same operator for all variants. Default160 remains because evidence is one portrait with coarse-scale tradeoffs; speed is not the acceptance criterion.</p>'''
body=[]
for r in rows:
 m=r['metrics'];e=r['effort'];routing=m.get('densityFit',{}).get('routingConnections',r['params'].get('simplification',{}).get('remainingRoutingConnections','see provenance'))
 body.append([esc(r['name']),esc(r['algorithm']),m['lines'],routing,f"{m['estimatedMeters']:.3f}",f"{max(0,m['estimatedMeters']-600):.3f}",f"{r['maxChord']}/32",f"{r['maxIncident']}/160",f"{e['actions']} / {e['starts']} / {e['knots']} / {e['colorChanges']}",f"{e['estimatedMinutes']:.3f}",esc(m['stoppedReason'])])
content+='<h2>Physical work / supply estimate</h2>'+table(['Variant','Algorithm','Connections','Routing included','Thread m','Shortfall vs600m','Max chord','Max incident','Actions / starts / knots / colors','Estimated minutes','Stopping reason'],body)
content+='<p>Length includes every route,8 mm wrapping per connection,12% reserve and0.5 m per color/start allowance.600 m is entered stock, not supplied material or proven physical sufficiency. Provisional32 undirected traversals/160 endpoint incidences share reverse edges and colors; they are not measured nail capacities. Time assumes8 seconds per connection and20 seconds per knot, not customer-measured time.</p>'
content+='<h2>Regional measurements / identical evaluation reference</h2><p>Lower tone/edge errors are helpful evidence, not likeness acceptance. At coarse160, eye tone/edge and nose tone worsen; disclose rather than hiding this scale tradeoff. Upper/lower-lip and nostril distinctions require visual inspection in the crops above. Jaw dark excess increases at all three scales (+0.005159 at512), despite improved tone/gradient errors; light-skin dark excess decreases (-0.007831 at512).</p>'
body=[]
for result in comparison['results']:
 a=result['variants'][0]['errors'];b=next(v for v in result['variants'] if v['name']=='candidate')['errors']
 for key in ['eyes','nose','mouth','face']:
  body.append([result['resolution'],key,f"{a[key]['mse']:.6f}",f"{b[key]['mse']:.6f}",f"{a[key]['edgeMse']:.6f}",f"{b[key]['edgeMse']:.6f}"])
content+=table(['Common grid','Region','Control tone MSE','New tone MSE','Control edge MSE','New edge MSE'],body)
body=[]
for result in comparison['results']:
 v=next(v for v in result['variants'] if v['name']=='candidate')
 for key,q in v.get('qualityAgainstControl',{}).items():
  body.append([result['resolution'],key,f"{q['referenceTargetError']:.6f}",f"{q['targetError']:.6f}",f"{q['referenceGradientError']:.6f}",f"{q['gradientError']:.6f}",f"{q['darkExcessChange']:+.6f}"])
content+='<h3>Each eye / jaw / light skin: common physical contrast samples</h3>'+table(['Grid','Region','Control tone','New tone','Control physical gradient','New physical gradient','Dark excess change'],body)
content+='''<h2>Runtime, integrity and acceptance</h2><p>New eight-sweep generation:288.597 s wall-clock (fresh basis fit and routing; no old160 seed). Checkpoints afterfour/eight sweeps remain valid under the original eight-sweep budget. Measured RSS peak366,804,992 bytes during generation (~349.8 MiB); later materializing the four-sweep snapshot reached382,054,400 bytes (~364.4 MiB). These are sampled process RSS, not guaranteed peak/phone memory. Source preparation and report/rendering overhead were not timed. The simplifier core ran50.684 s, its validated result was recorded at50.820 s, and complete command bookkeeping finished at51.848 s; combined generation plus simplification command339.446 s, excluding source preparation and report/export review. No hidden runtime guarantee.</p><p>Fit objective0.07408705; complete routed objective0.07389191. Routes happened to improve this objective slightly; numeric objective is not the visual winner rule. Job/state checks preserve cancellation, target/material/regions/grid/budget bindings. Legacy max192 validation remains; new v12 requires its own exact320 sampling provenance and opt-in circular basis. Strict sequence hash, routing/distribution, TXT, project import, preview/player and export checks are linked below.</p><p><strong>Open:</strong> varied portrait acceptance; actual printed assembly/tension/wrapping/thread use; current real Android execution/offline/audio/performance; iOS accounts/device/package; providers/commerce production and remaining full roadmap. APK compilation/asset matching is not a phone test. Next hypothesis: common fine-grid crossing noise/tone is a strand rasterization/objective bottleneck, not merely insufficient lines. Validate this opt-in on a varied local portrait set, then test a separate finite-width antialiased physical strand kernel against the unchanged complete reference and full routes. Do not repeat completed sweeps/simplification or silently change materials.</p>'''
for r in rows:
 content+=f'<details><summary>{esc(r["name"])} exact provenance</summary><pre>{esc(json.dumps({k:r[k] for k in ["hash","targetHash","params","metrics","evidence"]},indent=2))}</pre></details>'
content+='<p><a href="audit.json">Source/target audit</a> · <a href="integrity.json">Sequence/distribution audit</a> · <a href="comparison.json">Common-grid measurements and pruning differences</a> · <a href="selected-template-evidence.json">PDF coordinates</a> · <a href="pdf-audit.json">Complete PDF audit</a> · <a href="browser-verified.json">Browser checks</a> · <a href="unit-verified.json">130 domain tests</a> · <a href="apk-verified.txt">APK asset verification</a></p>'
(f/'report.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm · resolved portrait</title><style>body{font:16px/1.6 system-ui;max-width:1400px;margin:auto;padding:24px;color:#173f35;background:#faf8f1;overflow-wrap:anywhere}.row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}figure{margin:0}figcaption{font-size:13px;max-width:320px}img{background:white;border:1px solid #ddd}.hero{width:100%;max-width:1020px}h2{margin-top:40px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:10px;text-align:left;border-bottom:1px solid #ccc}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#1768a0}details{margin-top:16px}</style>'+content+'</html>',encoding='utf8')
# Entire instruction list, metadata and materials: do not just inspect a cover.
i=by['candidate-pruned'];expected=[]
for s in json.loads((f/'selected.json').read_text())['project']['instruction']['segments']:
 for a,b in zip(s['path'],s['path'][1:]):expected.append((a,b,s['color'].lower()))
with pdfplumber.open(f/'selected-guide.pdf') as pdf:
 texts=[p.extract_text() or '' for p in pdf.pages]
 assert pdf.metadata['Subject']=='Sequence SHA-256: '+i['hash']
 steps=[]
 for text in texts:
  for match in re.finditer(r'(\d+)\.\s+(\d+)\s*->\s*(\d+)\s+(#[0-9a-fA-F]{6})',text):steps.append((int(match[1]),int(match[2]),int(match[3]),match[4].lower()))
 assert steps==[(k+1,*v) for k,v in enumerate(expected)],'Missing/reordered physical steps'
 assert '0/1320' in texts[0] and '0.1' in texts[0] and '240' in texts[0]
 (f/'pdf-audit.json').write_text(json.dumps({'pages':len(pdf.pages),'stepsVerified':len(steps),'sequenceHash':i['hash'],'progress':0,'threadThicknessMm':0.1,'physicalAssemblyVerified':False},indent=2))
print('Report created; every PDF step, material, hash and zero progress checked.')
