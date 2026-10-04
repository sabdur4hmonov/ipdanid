"""Local diagnostics. Fixed image-space ROIs are manual measurements, not face detection."""
from pathlib import Path
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
folder=Path('output/fidelity')
variants=sys.argv[1:] or ['density-e1-s8']
boxes={'left eye':(51,55,83,76),'right eye':(87,55,119,76),'nose':(70,76,103,103),'mouth':(65,105,110,121),'jaw':(53,116,126,143),'light cheek':(100,78,116,103)}
names=['crop','target','baseline']+variants
images={name:Image.open(folder/f'{name}.png').convert('RGB') for name in names}
gray={name:np.asarray(im,dtype=float)@np.array([.2126,.7152,.0722])/255 for name,im in images.items()}
def measure(t,r,box):
 x0,y0,x1,y1=box;t=t[y0:y1,x0:x1];r=r[y0:y1,x0:x1]
 tg=np.concatenate([np.diff(t,axis=0).ravel(),np.diff(t,axis=1).ravel()]);rg=np.concatenate([np.diff(r,axis=0).ravel(),np.diff(r,axis=1).ravel()])
 return dict(mse=float(np.mean((r-t)**2)),meanBias=float(np.mean(r-t)),darkExcessFraction=float(np.mean(r<t-.08)),edgeMse=float(np.mean((rg-tg)**2)),gradientCorrelation=float(np.corrcoef(tg,rg)[0,1]),targetContrast=float(np.std(t)),resultContrast=float(np.std(r)))
metrics={name:{region:measure(gray['target'],gray[name],box) for region,box in boxes.items()} for name in names if name not in ['target','crop']}
prep={region:measure(gray['crop'],gray['target'],box) for region,box in boxes.items()}
scales={}
for name in ['baseline']+variants:
 scales[name]={}
 for scale in [1,2,4,8]:
  def reduced(im):return np.asarray(im.crop((34,29,135,145)).resize((101//scale,116//scale),Image.Resampling.BOX),dtype=float)@np.array([.2126,.7152,.0722])/255
  scales[name][scale]=float(np.mean((reduced(images[name])-reduced(images['target']))**2))
def sheet(regions,scale,out):
 col=max(int((b[2]-b[0])*scale)+20 for _,b in regions);w=len(names)*col;h=sum(int((b[3]-b[1])*scale)+48 for _,b in regions);im=Image.new('RGB',(w,h),'#faf8ef');d=ImageDraw.Draw(im);y=0
 for region,b in regions:
  for j,name in enumerate(names):
   c=images[name].crop(b);c=c.resize((int(c.width*scale),int(c.height*scale)),Image.Resampling.NEAREST);im.paste(c,(j*col,y+22));d.text((j*col,y),f'{region} / {name}',fill='black')
  y+=int((b[3]-b[1])*scale)+48
 im.save(folder/out)
sheet([('full portrait',(0,0,160,160))],1,'ordinary-comparison.png')
sheet(list(boxes.items()),4,'regions-comparison.png')
data=dict(manualPixelBoxes=boxes,preprocessing=prep,regions=metrics,multiscaleMse=scales,physicalAssemblyValidated=False)
(folder/'measurements.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print(json.dumps(data))
