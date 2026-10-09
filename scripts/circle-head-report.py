from pathlib import Path
from PIL import Image,ImageDraw
import json,math,html
import numpy as np
f=Path('output/circle-head');h=Path('output/outline');n=160
base=json.loads((h/'baseline.json').read_text())['project']
projects={'heart':json.loads((h/'outline-guide.json').read_text())['project'],'circle':json.loads((f/'circle-guide.json').read_text())['project']}
settings={'heart':json.loads((h/'outline-settings.json').read_text()),'circle':json.loads((f/'circle-settings.json').read_text())}
folders={'heart':(h,'outline'),'circle':(f,'circle')}
for label,folder in [('circle240',Path('output/circle-head-240')),('circle240-clean',Path('output/circle-head-240-clean')),('circle240-192',Path('output/circle-head-240-192'))]:
 if (folder/'circle-sequence.png').exists():
  projects[label]=json.loads((folder/'circle-guide.json').read_text())['project'];settings[label]=json.loads((folder/'circle-settings.json').read_text());folders[label]=(folder,'circle')
def inverse(x,y,e):
 scale=n/960*e['zoom'];a=math.radians(e['rotation']);dx=x*(n-1)+.5-n/2;dy=y*(n-1)+.5-n/2
 return ((math.cos(a)*dx+math.sin(a)*dy-e['panX']*n)/scale+480,(-math.sin(a)*dx+math.cos(a)*dy-e['panY']*n)/scale+640)
def forward(x,y,e):
 scale=n/960*e['zoom'];a=math.radians(e['rotation']);dx=(x-480)*scale+e['panX']*n;dy=(y-640)*scale+e['panY']*n
 return ((n/2+math.cos(a)*dx-math.sin(a)*dy-.5)/(n-1),(n/2+math.sin(a)*dx+math.cos(a)*dy-.5)/(n-1))
regions={k:[inverse(b['left'],b['top'],base['edits']),inverse(b['left']+b['width'],b['top']+b['height'],base['edits'])] for k,b in base['instruction']['params']['portrait']['regions'].items() if isinstance(b,dict)}
full=Image.new('RGB',(720,len(projects)*280),'#faf8ef');d=ImageDraw.Draw(full)
features=Image.new('RGB',(450,len(projects)*len(regions)*184),'white');fd=ImageDraw.Draw(features);measurements={}
for row,k in enumerate(projects):
 n=projects[k]['instruction']['params']['resolution']
 folder,prefix=folders[k]
 ims={kind:Image.open(folder/f'{prefix}-{kind}.png').convert('RGB') for kind in ['source','target','sequence']}
 for col,kind in enumerate(['source','target','sequence']):full.paste(ims[kind].resize((224,224)),(240*col,row*280+40));d.text((240*col,row*280+10),k+' '+kind,fill='black')
 diagnostics={}
 for r,(feature,box) in enumerate(regions.items()):
  l,t=forward(*box[0],settings[k]['edits']);right,bottom=forward(*box[1],settings[k]['edits']);assert min(l,t)>=0 and max(right,bottom)<=1
  crops={kind:im.transform((64,64),Image.Transform.EXTENT,(.5+l*(n-1),.5+t*(n-1),.5+right*(n-1),.5+bottom*(n-1)),Image.Resampling.BILINEAR) for kind,im in ims.items()}
  for col,kind in enumerate(['source','target','sequence']):
   x=col*150;y=(row*len(regions)+r)*184;features.paste(crops[kind].resize((144,144),Image.Resampling.NEAREST),(x,y+32));fd.text((x,y+3),k+' '+feature,fill='black');fd.text((x,y+16),kind,fill='black')
  diagnostics[feature]={'sourceCorners':box,'nativeWidthPixels':(right-l)*(n-1),'nativeHeightPixels':(bottom-t)*(n-1),'rgbMse64':float(np.mean((np.asarray(crops['sequence'])/255-np.asarray(crops['target'])/255)**2)),'targetBox':[l,t,right,bottom]}
 i=projects[k]['instruction'];measurements[k]={'shape':i['profile']['shape'],'pins':len(i['profile']['pins']),'resolution':i['params']['resolution'],'sequenceHash':i['sequenceHash'],'connections':i['metrics']['lines'],'estimatedMeters':i['metrics']['estimatedMeters'],'fitRatio':settings[k]['ratio'],'features':diagnostics}
full.save(f/'comparison.png');features.save(f/'features.png');(f/'measurements.json').write_text(json.dumps(measurements,indent=2))
cards=''.join('<section><h2>'+k+'</h2><img width="'+str(data['resolution'])+'" src="'+('../'+folders[k][0].name+'/'+folders[k][1])+'-sequence.png"><pre>'+html.escape(json.dumps({x:v for x,v in data.items() if x!='features'},indent=2))+'</pre><a href="../'+folders[k][0].name+'/'+folders[k][1]+'-guide.json">Project</a> · <a href="../'+folders[k][0].name+'/'+folders[k][1]+'-guide.pdf">Exact PDF</a></section>' for k,data in measurements.items())
(f/'report.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm — separate circle head comparison</title><style>body{font:16px system-ui;margin:24px;max-width:1100px;color:#18201d;background:#faf8ef}img{max-width:100%;height:auto}section{display:inline-block;vertical-align:top;width:340px;margin:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>Whole-head circle versus preserved heart</h1><p>Same owner-authorized source and manually marked head/anatomy. Explicitly changed shape/pin coordinates and crop: same160pins,400×400mm,0.1mm,160computation,v6→v8/eight sweeps,32chord/160incident guards. Separate new guide at progress0; old guide preserved. Every sequence image comes from all actual strands; no photo overlay or sharpening.</p><p><b>Human likeness and physical assembly acceptance remain open.</b> Geometry is not a quality guarantee. Different crop/board invalidates claims of quality-equivalent strand savings. Thread stock is an estimate; no default was changed. Native160 previews below and equally resampled source-relative features help inspect detail.</p>'''+cards+'''<h2>Source / target / exact sequence</h2><img src="comparison.png"><h2>Matched source anatomy</h2><img src="features.png"><p>Each feature is bilinear64×64 then enlarged equally. Preprocessing and native detail sizes differ; RGB error is diagnostic, not a likeness score.</p><p><a href="circle-guide.json">New project</a> · <a href="circle-guide.pdf">Complete exact guide</a> · <a href="measurements.json">Measurements</a> · <a href="/">Website</a></p></html>''',encoding='utf8')
print(json.dumps(measurements,indent=2))
page=f/'report.html';markup=page.read_text(encoding='utf8')
markup=markup.replace('same160pins,400×400mm,0.1mm,160computation','160 or240 disclosed pins,400×400mm,0.1mm,160 or192 disclosed computation')
markup=markup.replace('Native160 previews below','Native160/192 previews below')
notice='''<h2>Quality decision</h2><p>Centered circles retain more facial area than the heart; board/crop changes are explicit. Background lightening saves340connections against the240-circle but worsens eye/nose/lip error, so it is optional and not accepted quality-equivalent simplification. Larger-face192 retains the exact240-circle crop/pins/materials and source anatomy; it improves shared-grid eye/lip error but slightly worsens nose edges. <b>Likeness remains inconclusive. Default160/unrotated is preserved.</b> Thread/time figures are estimates; these development profiles have not been physically calibrated.</p>'''
if (f/'browser-evidence.json').exists():
 evidence=json.loads((f/'browser-evidence.json').read_text())
 if all('commonGrid' in r for r in evidence['exact']):
  notice+='''<h2>Common384 sample grid — actual strands</h2><p>Same400mm board/crop, unchanged canonical source target/preprocessing at384, source-remapped anatomy. Every reconstruction uses its complete sealed sequence at384; this is evaluation only and does not change guide metadata or optimization resolution. Error is diagnostic, not human likeness or physical acceptance.</p><article><h3>Canonical source target</h3><img width="384" src="common-target.png"></article>'''
  for r in evidence['exact']:
   notice+='<article><h3>'+html.escape(r['folder'])+'</h3><img width="384" src="../'+r['folder']+'/circle-common.png"><pre>'+html.escape(json.dumps(r['commonGrid']['headMetrics'],indent=2))+'</pre></article>'
markup=markup.replace('</html>',notice+'</html>');page.write_text(markup,encoding='utf8')
