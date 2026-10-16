import numpy as np, cv2, sys
N=500
t=np.fromfile(sys.argv[2] if len(sys.argv)>2 else 'target.f32',dtype=np.float32).reshape(N,N)
t0=np.fromfile('target.f32',dtype=np.float32).reshape(N,N)
r=np.fromfile(sys.argv[1],dtype=np.float32).reshape(1000,1000)
def view(a,s=160):
    return cv2.resize(cv2.GaussianBlur(a,(0,0),a.shape[0]/s*0.6),(s,s),interpolation=cv2.INTER_AREA)
R=view(r); T=view(t0)
yy,xx=np.mgrid[0:160,0:160]; circ=((xx-79.5)**2+(yy-79.5)**2)<78**2
face=((xx-80)/38)**2+((yy-96)/45)**2<1
def ssim(a,b,m):
    C1,C2=0.01**2,0.03**2
    mu1=cv2.GaussianBlur(a,(7,7),1.5);mu2=cv2.GaussianBlur(b,(7,7),1.5)
    s1=cv2.GaussianBlur(a*a,(7,7),1.5)-mu1**2;s2=cv2.GaussianBlur(b*b,(7,7),1.5)-mu2**2;s12=cv2.GaussianBlur(a*b,(7,7),1.5)-mu1*mu2
    S=((2*mu1*mu2+C1)*(2*s12+C2))/((mu1**2+mu2**2+C1)*(s1+s2+C2)); return S[m].mean()
# normalize render to target mean/std inside circle (viewer adapts)
print(f"{sys.argv[1]}: ssim_all={ssim(R,T,circ):.3f} ssim_face={ssim(R,T,face):.3f} corr_face={np.corrcoef(R[face],T[face])[0,1]:.3f}")
