import sys, numpy as np, cv2
src=cv2.imread('face.png')
h,w=src.shape[:2]
# GrabCut init: corners background, centre probable foreground
mask=np.full((h,w),cv2.GC_PR_BGD,np.uint8)
cv2.ellipse(mask,(w//2,int(h*0.47)),(int(w*0.33),int(h*0.47)),0,0,360,cv2.GC_PR_FGD,-1)
cv2.ellipse(mask,(w//2,int(h*0.55)),(int(w*0.18),int(h*0.25)),0,0,360,cv2.GC_FGD,-1)
mask[:, :20]=cv2.GC_BGD; mask[:, -20:]=cv2.GC_BGD; mask[:20,:int(w*0.2)]=cv2.GC_BGD; mask[:20,-int(w*0.2):]=cv2.GC_BGD
bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
cv2.grabCut(src,mask,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
fgm=np.where((mask==1)|(mask==3),1.0,0.0).astype(np.float32)
fgm=cv2.GaussianBlur(fgm,(7,7),0)
gray=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY)
clahe=cv2.createCLAHE(clipLimit=2.0,tileGridSize=(8,8))
g=clahe.apply(gray).astype(np.float32)/255
# stretch inside subject
vals=g[fgm>0.5]; lo,hi=np.percentile(vals,1),np.percentile(vals,99)
g=np.clip((g-lo)/(hi-lo),0,1)
# mild unsharp
bl=cv2.GaussianBlur(g,(0,0),2.0); g=np.clip(g+0.6*(g-bl),0,1)
g=g*fgm+1.0*(1-fgm)   # white background
N=int(sys.argv[1]) if len(sys.argv)>1 else 500
g=cv2.resize(g,(N,N),interpolation=cv2.INTER_AREA)
cv2.imwrite('target.png',(g*255).astype(np.uint8))
g.astype(np.float32).tofile('target.f32')
print('ok',N)
