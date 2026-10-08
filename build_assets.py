"""Original hand-crafted procedural pixel art for Desert Finding.
No external textures, models, fonts or network assets are used.
Run: python build_assets.py (Pillow required).
"""
from __future__ import annotations
import math
import json
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'assets'
ASSETS.mkdir(exist_ok=True)

C={
 'ink':'#2A2830','deep':'#45352F','sienna':'#704933','bark':'#7E513A',
 'sand':'#DAB475','sand_light':'#E8C98E','sand_hi':'#F2D99E','sand_dark':'#B78B55',
 'cloth':'#596B65','cloth_light':'#789183','cloth_dark':'#374D4B',
 'skin':'#B97D5D','skin_hi':'#E0AF82','boot':'#543B36','boot_hi':'#927056',
 'brass':'#B38248','brass_hi':'#F3C97D','brass_dark':'#6A4937',
 'face':'#EDE0B9','face_dark':'#D0BC8B','red':'#CC5748','red_hi':'#F18468',
 'steel':'#536B72','water':'#457C82','water_hi':'#78B2A3','water_dark':'#315960',
 'leaf':'#43665B','leaf_hi':'#6C8971','leaf_dark':'#304B49',
 'night':'#112339','night2':'#172E41','light':'#FFE09A'
}

def box(d,b,fill,outline=None,width=1): d.rectangle(tuple(map(int,b)),fill=fill,outline=outline,width=width)
def ellipse(d,b,fill,outline=None,width=1): d.ellipse(tuple(map(int,b)),fill=fill,outline=outline,width=width)
def line(d,coords,fill,width=1): d.line(coords,fill=fill,width=width,joint='curve')
def pts(cx,cy,r,n=8,phase=0):
 return [(round(cx+math.cos(phase+i*2*math.pi/n)*r),round(cy+math.sin(phase+i*2*math.pi/n)*r)) for i in range(n)]

# Compact uppercase 5x7 bitmap letterforms; transparent pixels remain transparent.
FONT={
'A':["01110","10001","10001","11111","10001","10001","10001"],
'B':["11110","10001","10001","11110","10001","10001","11110"],
'C':["01111","10000","10000","10000","10000","10000","01111"],
'D':["11110","10001","10001","10001","10001","10001","11110"],
'E':["11111","10000","10000","11110","10000","10000","11111"],
'F':["11111","10000","10000","11110","10000","10000","10000"],
'G':["01111","10000","10000","10111","10001","10001","01110"],
'H':["10001","10001","10001","11111","10001","10001","10001"],
'I':["11111","00100","00100","00100","00100","00100","11111"],
'J':["00111","00010","00010","00010","10010","10010","01100"],
'K':["10001","10010","10100","11000","10100","10010","10001"],
'L':["10000","10000","10000","10000","10000","10000","11111"],
'M':["10001","11011","10101","10101","10001","10001","10001"],
'N':["10001","11001","10101","10011","10001","10001","10001"],
'O':["01110","10001","10001","10001","10001","10001","01110"],
'P':["11110","10001","10001","11110","10000","10000","10000"],
'Q':["01110","10001","10001","10001","10101","10010","01101"],
'R':["11110","10001","10001","11110","10100","10010","10001"],
'S':["01111","10000","10000","01110","00001","00001","11110"],
'T':["11111","00100","00100","00100","00100","00100","00100"],
'U':["10001","10001","10001","10001","10001","10001","01110"],
'V':["10001","10001","10001","10001","10001","01010","00100"],
'W':["10001","10001","10001","10101","10101","10101","01010"],
'X':["10001","10001","01010","00100","01010","10001","10001"],
'Y':["10001","10001","01010","00100","00100","00100","00100"],
'Z':["11111","00001","00010","00100","01000","10000","11111"],
'0':["01110","10011","10101","10101","11001","10001","01110"],
'1':["00100","01100","00100","00100","00100","00100","01110"],
'2':["01110","10001","00001","00010","00100","01000","11111"],
'3':["11110","00001","00001","00110","00001","00001","11110"],
'4':["00010","00110","01010","10010","11111","00010","00010"],
'5':["11111","10000","10000","11110","00001","00001","11110"],
'6':["01111","10000","10000","11110","10001","10001","01110"],
'7':["11111","00001","00010","00100","01000","01000","01000"],
'8':["01110","10001","10001","01110","10001","10001","01110"],
'9':["01110","10001","10001","01111","00001","00001","11110"],
'-':["00000","00000","00000","11111","00000","00000","00000"],
'/':["00001","00001","00010","00100","01000","10000","10000"],
':':["00000","00100","00100","00000","00100","00100","00000"],
'.':["00000","00000","00000","00000","00000","00100","00100"],
'°':["01100","10010","01100","00000","00000","00000","00000"],
'!':["00100","00100","00100","00100","00100","00000","00100"],
' ':["00000"]*7,
}
def pixtext(im,xy,s,color='#FFFFFF',scale=1,spacing=1):
 d=ImageDraw.Draw(im)
 x0,y0=xy
 for j,ch in enumerate(s.upper()):
  mat=FONT.get(ch,FONT[' ']); posx=x0+j*(5+spacing)*scale
  for iy,row in enumerate(mat):
   for ix,v in enumerate(row):
    if v=='1':box(d,(posx+ix*scale,y0+iy*scale,posx+(ix+1)*scale-1,y0+(iy+1)*scale-1),color)

def center_text(im,cy,s,color='#FFFFFF',scale=1,spacing=1):
 width=(len(s)*(5+spacing)-spacing)*scale
 pixtext(im,((im.width-width)//2,cy),s,color,scale,spacing)

# 1. player sprite atlases 6 frames x 8 directions (N,NE,E,SE,S,SW,W,NW).
FRAME=64; FRAMES=6; DIRS=8
stride=[0,2,4,2,0,-3]
bob=[0,-1,0,1,0,-1]

def draw_player_frame(frame,night=False):
 im=Image.new('RGBA',(64,64),(0,0,0,0));d=ImageDraw.Draw(im)
 # Behind the head, top-down shoulders and legs; strictly no face or side-profile.
 st=stride[frame];hb=bob[frame]
 # Left boot and pant leg (positive stride -> left foot forward)
 ellipse(d,(21,36-st,30,48-st),C['ink'])
 box(d,(22,37-st,29,45-st),C['cloth_dark'])
 box(d,(22,43-st,30,52-st),C['boot'])
 box(d,(23,44-st,28,47-st),C['boot_hi'])
 box(d,(23,50-st,29,51-st),C['ink'])
 # Right boot alternate
 ellipse(d,(34,36+st,43,49+st),C['ink'])
 box(d,(35,36+st,42,45+st),C['cloth_dark'])
 box(d,(35,43+st,43,52+st),C['boot'])
 box(d,(36,44+st,41,47+st),C['boot_hi'])
 box(d,(36,50+st,42,51+st),C['ink'])
 # minimal backpack/shoulders, mostly concealed by head brim
 ellipse(d,(21,24+hb,43,43+hb),C['ink'])
 ellipse(d,(23,26+hb,41,41+hb),C['cloth'])
 box(d,(24,36+hb,40,38+hb),C['cloth_dark'])
 # bent arms to either side, cloth + little exposed hands
 line(d,[(25,30+hb),(19,33+hb),(17,38+hb)],C['ink'],8)
 line(d,[(25,30+hb),(19,33+hb),(17,38+hb)],C['cloth_dark'],6)
 line(d,[(25,30+hb),(19,33+hb),(17,36+hb)],C['cloth_light'],2)
 line(d,[(39,30+hb),(46,32+hb),(49,37+hb)],C['ink'],8)
 line(d,[(39,30+hb),(46,32+hb),(49,37+hb)],C['cloth_dark'],6)
 line(d,[(39,30+hb),(45,31+hb),(48,35+hb)],C['cloth_light'],2)
 ellipse(d,(13,35+hb,21,43+hb),C['skin'])
 ellipse(d,(46,34+hb,53,41+hb),C['skin'])
 box(d,(14,36+hb,17,38+hb),C['skin_hi'])
 box(d,(47,35+hb,49,36+hb),C['skin_hi'])
 # small right-hand brass compass viewed from directly above
 ellipse(d,(46,34+hb,57,45+hb),C['ink'])
 ellipse(d,(47,35+hb,56,44+hb),C['brass_hi'])
 ellipse(d,(49,37+hb,54,42+hb),C['face'])
 # dial pivot only: runtime draws an independently North-pointing needle.
 box(d,(51,39+hb,52,40+hb),C['ink'])
 # wide top-down hat with clear concentric crown and rim silhouette
 ellipse(d,(17,11+hb,47,41+hb),C['ink'])
 ellipse(d,(18,12+hb,46,39+hb),C['sienna'])
 ellipse(d,(20,13+hb,44,37+hb),C['sand_hi'])
 ellipse(d,(21,14+hb,43,35+hb),C['sand_light'])
 ellipse(d,(23,15+hb,41,33+hb),C['brass'])
 ellipse(d,(24,16+hb,40,31+hb),C['sand_hi'])
 ellipse(d,(26,17+hb,38,29+hb),C['sand_light'])
 box(d,(25,24+hb,39,25+hb),C['sienna'])
 box(d,(24,26+hb,40,27+hb),C['sienna'])
 box(d,(27,19+hb,30,21+hb),'#F5DFAB')
 box(d,(31,17+hb,34,18+hb),C['sand_hi'])
 # stitched hat brim; each stitch is a pixel, never a side profile
 for sx,sy in ((20,24),(21,29),(25,35),(33,37),(41,33),(44,27),(42,19),(26,13)):
  box(d,(sx,sy+hb,sx+1,sy+hb),C['bark'])
 if night:
  # lantern in left hand, warm glass + tiny cage seen from above
  box(d,(8,36+hb,17,47+hb),C['ink'])
  box(d,(9,37+hb,16,46+hb),C['brass_dark'])
  box(d,(10,38+hb,15,45+hb),C['brass_hi'])
  box(d,(11,39+hb,14,44+hb),'#FFDF8B')
  box(d,(12,40+hb,13,42+hb),'#FFF4C1')
  line(d,[(9,40+hb),(9,44+hb)],C['ink'],1)
  line(d,[(16,40+hb),(16,44+hb)],C['ink'],1)
  box(d,(11,34+hb,14,36+hb),C['brass'])
 return im

for night in (False,True):
 atlas=Image.new('RGBA',(FRAME*FRAMES,FRAME*DIRS),(0,0,0,0))
 for direction in range(DIRS):
  for frame in range(FRAMES):
   p=draw_player_frame(frame,night)
   p=p.rotate(-direction*45,resample=Image.Resampling.NEAREST,expand=False,center=(32,32))
   atlas.alpha_composite(p,(frame*FRAME,direction*FRAME))
 atlas.save(ASSETS/('player_night.png' if night else 'player_day.png'), optimize=True)

# 2. Generative seamless-leaning sand tiles; pixels same base at edges, sparse randomized details inside.
TILE=64;SAND_VARIANTS=16
sand=Image.new('RGB',(TILE*4,TILE*4),C['sand']);d=ImageDraw.Draw(sand)
for n in range(16):
 rng=random.Random(93072+n*7517)
 ox=(n%4)*64;oy=(n//4)*64
 for _ in range(235):
  x=ox+rng.randrange(64);y=oy+rng.randrange(64)
  color=rng.choices([C['sand_light'],C['sand_dark'],C['sand_hi'],'#D2AB6E'],[36,28,12,24])[0]
  if rng.random()<0.19:
   d.line([(x,y),(min(x+1,ox+63),y)],fill=color,width=1)
  else: d.point((x,y),fill=color)
 # occasional wind-shaped ripple clusters (avoid tile boundary)
 for _ in range(rng.randint(1,3)):
  rx=ox+rng.randint(8,36);ry=oy+rng.randint(8,48)
  w=rng.randint(7,18)
  for i in range(rng.randint(2,4)):
   y=ry+i*3
   if y >= oy+60:break
   d.line([(rx,y+2),(rx+int(w*.4),y),(min(rx+w,ox+59),y+1)],fill=C['sand_dark'] if i%3==0 else C['sand_light'],width=1)
 # hairline dust grains
 for _ in range(12):
  x=ox+rng.randint(2,61);y=oy+rng.randint(2,61)
  d.point((x,y),fill='#EFD196')
sand.save(ASSETS/'sand_tiles.png',optimize=True)

# 3. scatter-decor atlas, 12 blocks 32x32 (4 cols x 3 rows)
details=Image.new('RGBA',(32*4,32*3),(0,0,0,0));d=ImageDraw.Draw(details)
for i in range(12):
 r=random.Random(87536+i*1007); ox=(i%4)*32;oy=(i//4)*32
 if i in (0,1,2,3,4):
  for j in range(3+i%3):
   x=ox+3+j*r.randint(3,5);y=oy+10+j*r.randint(2,4)
   line(d,[(x,y+2),(x+4,y),(x+8,y+1)],C['sand_dark'] if j%2 else '#F0CC8D',1)
 elif i in (5,6,7):
  for j in range(5+i%3):
   x=ox+r.randint(5,26);y=oy+r.randint(5,26);rr=r.randint(1,3)
   ellipse(d,(x,y,x+rr+1,y+rr),C['bark'])
   box(d,(x,y,x+rr-1,y),C['sand_light'])
 elif i==8:
  line(d,[(ox+9,oy+19),(ox+13,oy+14),(ox+16,oy+18),(ox+23,oy+12)],'#D4C09A',2)
  ellipse(d,(ox+7,oy+17,ox+11,oy+21),'#E4D5B4')
  ellipse(d,(ox+22,oy+9,ox+26,oy+14),'#E4D5B4')
 elif i==9:
  for q in range(7):
   x=ox+r.randint(3,26);y=oy+r.randint(3,25)
   box(d,(x,y,x+r.randint(1,2),y),C['sand_hi'])
 elif i==10:
  # isolated dry desert sprig seen overhead
  line(d,[(ox+16,oy+23),(ox+16,oy+8)],C['bark'],2)
  for q in range(5):
   sy=oy+9+q*3;sign=1 if q%2 else -1
   line(d,[(ox+16,sy),(ox+16+sign*6,sy-4)],'#948452',1)
 elif i==11:
  for q in range(5):
   x=ox+5+q*5;y=oy+14+(q%2)*3
   d.point((x,y),fill=C['bark'])
   d.point((x+1,y+1),fill=C['sand_dark'])
details.save(ASSETS/'sand_details.png',optimize=True)

# 4. left/right boot footprint icons, 16x16 each.
fp=Image.new('RGBA',(32,16),(0,0,0,0));d=ImageDraw.Draw(fp)
for i in range(2):
 ox=i*16
 # rough depression, narrow heel, wider toe, offset slight left/right
 xx=5 if i==0 else 7
 ellipse(d,(ox+xx-1,5,ox+xx+5,13),(141,99,55,100))
 ellipse(d,(ox+xx,3,ox+xx+5,9),(125,85,50,105))
 box(d,(ox+xx+1,4,ox+xx+3,5),(246,209,151,75))
 box(d,(ox+xx,11,ox+xx+3,12),(240,201,140,65))
fp.save(ASSETS/'footprints.png',optimize=True)

# 5. compass image; independent needle ensures actual heading logic is handled in the game.
SZ=128; cx=cy=64
base=Image.new('RGBA',(SZ,SZ),(0,0,0,0));d=ImageDraw.Draw(base)
# outer brass, polygon facets, highlights
ellipse(d,(4,5,124,125),C['ink'])
ellipse(d,(6,7,121,122),C['brass_dark'])
ellipse(d,(9,10,118,119),C['brass'])
ellipse(d,(12,13,115,116),C['brass_hi'])
ellipse(d,(16,17,111,112),C['brass_dark'])
ellipse(d,(19,20,108,109),C['face_dark'])
ellipse(d,(22,23,105,106),C['face'])
# subtle etched sectors on parchment dial
for deg in range(0,360,15):
 rad=math.radians(deg-90); major=(deg%45==0)
 r1=38 if major else 42;r2=46
 px=lambda r:round(cx+math.cos(rad)*r)
 py=lambda r:round(cy+math.sin(rad)*r)
 line(d,[(px(r1),py(r1)),(px(r2),py(r2))],C['sienna'] if major else '#A18B67',2 if major else 1)
for angle in (45,135,225,315):
 rad=math.radians(angle-90)
 x=cx+math.cos(rad)*31;y=cy+math.sin(rad)*31
 d.polygon(pts(x,y,2,4,phase=math.pi/4),fill='#9D8867')
# NSEW positions, cardinal letters 5x7 x2
pixtext(base,(59,27),'N',C['red'],2)
pixtext(base,(59,88),'S',C['sienna'],2)
pixtext(base,(88,60),'E',C['sienna'],2)
pixtext(base,(29,60),'W',C['sienna'],2)
# four brass screws
for bx,by in ((21,22),(107,22),(21,108),(107,108)):
 ellipse(d,(bx-3,by-3,bx+3,by+3),C['ink'])
 ellipse(d,(bx-2,by-2,bx+2,by+2),C['brass_hi'])
 line(d,[(bx-1,by+1),(bx+1,by-1)],C['bark'],1)
base.save(ASSETS/'compass_base.png',optimize=True)

needle=Image.new('RGBA',(SZ,SZ),(0,0,0,0));d=ImageDraw.Draw(needle)
# north = red upper tip; lower tail is steel grey
d.polygon([(64,29),(58,69),(64,63),(70,69)],fill=C['ink'])
d.polygon([(64,32),(60,63),(64,60),(68,63)],fill=C['red'])
d.polygon([(64,39),(62,59),(64,56)],fill=C['red_hi'])
d.polygon([(64,97),(57,63),(64,68),(71,63)],fill=C['ink'])
d.polygon([(64,92),(60,68),(64,71),(68,68)],fill=C['steel'])
ellipse(d,(57,57,71,71),C['ink'])
ellipse(d,(59,59,69,69),C['brass_hi'])
ellipse(d,(62,62,66,66),C['ink'])
box(d,(63,62,64,63),'#FAE7A1')
needle.save(ASSETS/'compass_needle.png',optimize=True)

# optional glass overlay, subtle rectangular sheen drawn in pixel bands
glass=Image.new('RGBA',(SZ,SZ),(0,0,0,0));d=ImageDraw.Draw(glass)
for y,a in ((33,20),(35,16),(38,10)):
 line(d,[(34,y),(43,y-6),(52,y-9)],(255,255,247,a),2)
for bx,by in ((44,39),(48,36),(52,35)):
 box(d,(bx,by,bx+3,by+1),(255,250,230,16))
glass.save(ASSETS/'compass_glass.png',optimize=True)

# 6. pixel oasis (entirely top down, no horizon or side-facing elements)
r=random.Random(51011)
oas=Image.new('RGBA',(160,160),(0,0,0,0));d=ImageDraw.Draw(oas)
# sand rise around the pool, slight ring, stepping-stone clusters
poly=[(41,64),(53,46),(80,37),(105,42),(119,59),(126,79),(117,103),(98,116),(76,117),(57,107),(42,88)]
d.polygon(poly,fill='#B58A59')
d.polygon([(45,65),(57,50),(81,43),(103,47),(115,62),(120,79),(112,99),(96,111),(77,111),(60,102),(47,86)],fill='#F0D29A')
d.polygon([(50,65),(61,54),(81,48),(101,52),(110,65),(115,80),(106,96),(93,104),(76,104),(62,98),(52,85)],fill=C['water_dark'])
d.polygon([(55,67),(64,56),(80,53),(98,56),(105,68),(109,80),(101,92),(91,99),(77,98),(63,93),(56,81)],fill=C['water'])
d.polygon([(66,61),(79,57),(98,65),(95,71),(83,68)],fill=C['water_hi'])
for _ in range(44):
 x=r.randrange(56,109);y=r.randrange(57,97)
 if 0<=x<160 and 0<=y<160 and oas.getpixel((x,y))[0] in (69,120,49):
  d.point((x,y),fill=r.choice(['#699F99','#7CB5A7','#3D707A']))
for _ in range(55):
 x=r.randrange(30,135);y=r.randrange(31,130)
 if oas.getpixel((x,y))[3]==0:
  d.point((x,y),fill=r.choice(['#BD945A','#EDC88A','#E8C98E']))
# palm canopy radial star shaped, top-down leaf shadows and bright fronds

def palm(cxx,cyy,rad):
 ellipse(d,(cxx-rad-3,cyy-rad+3,cxx+rad+2,cyy+rad+4),(60,57,39,75))
 for k in range(11):
  theta=2*math.pi*k/11+0.09
  endx=cxx+math.cos(theta)*rad;endy=cyy+math.sin(theta)*rad
  side=theta+math.pi/2
  px1=cxx+math.cos(theta)*4+math.cos(side)*4
  py1=cyy+math.sin(theta)*4+math.sin(side)*4
  px2=cxx+math.cos(theta)*4-math.cos(side)*4
  py2=cyy+math.sin(theta)*4-math.sin(side)*4
  d.polygon([(px1,py1),(endx,endy),(px2,py2)],fill=C['leaf_dark'])
  line(d,[(cxx,cyy),(endx,endy)],C['leaf'] if k%3==0 else C['leaf_hi'],2)
  # leaf side flicks
  mx=cxx+math.cos(theta)*rad*.6;my=cyy+math.sin(theta)*rad*.6
  sidef=theta+(1 if k%2 else -1)*.35
  line(d,[(mx,my),(mx+math.cos(sidef)*5,my+math.sin(sidef)*5)],C['leaf'],1)
 ellipse(d,(cxx-3,cyy-3,cxx+3,cyy+3),C['bark'])
 box(d,(cxx-1,cyy-1,cxx,cyy),'#B4875F')
palm(39,48,22);palm(127,69,24);palm(83,118,21)
for px,py in ((22,83),(133,106),(52,129)):
 for k in range(6):
  th=math.pi*2*k/6
  line(d,[(px,py),(px+math.cos(th)*r.randint(5,11),py+math.sin(th)*r.randint(5,11))],C['leaf'] if k%2 else C['leaf_hi'],2)
oas.save(ASSETS/'oasis.png',optimize=True)

# 7. compact shadow silhouette for sun projection
shadow=Image.new('RGBA',(64,64),(0,0,0,0));d=ImageDraw.Draw(shadow)
ellipse(d,(17,15,47,41),(65,48,38,90))
box(d,(21,34,30,49),(65,48,38,66));box(d,(35,34,44,50),(65,48,38,66))
line(d,[(20,28),(13,38)],(65,48,38,60),7)
line(d,[(43,28),(53,38)],(65,48,38,60),7)
shadow.save(ASSETS/'player_shadow.png',optimize=True)

# 8. asset metadata for runtime and agent
manifest={
 'license':'CC0-1.0 (original generated pixel assets for Desert Finding)',
 'palette':C,'coordinateSystem':'+x east/right; +y south/down; world north = screen up',
 'pixelArt':{'internalResolution':[480,270],'sampling':'nearest','pixelSnap':True},
 'sheets':{
  'player_day.png':{'frameWidth':64,'frameHeight':64,'columns':6,'rows':8,'directions':['N','NE','E','SE','S','SW','W','NW'],'origin':'64x64 frames; frame x direction; 0..5 walking frame'},
  'player_night.png':{'frameWidth':64,'frameHeight':64,'columns':6,'rows':8,'directions':['N','NE','E','SE','S','SW','W','NW'],'origin':'same mapping; lantern mounted on traveler left hand'},
  'sand_tiles.png':{'frameWidth':64,'frameHeight':64,'columns':4,'rows':4,'variants':16},
  'sand_details.png':{'frameWidth':32,'frameHeight':32,'columns':4,'rows':3,'variants':12,'transparent':True},
  'footprints.png':{'frameWidth':16,'frameHeight':16,'columns':2,'rows':1,'variants':2,'transparent':True},
 },
 'static':{'compass_base.png':[128,128],'compass_needle.png':[128,128],'compass_glass.png':[128,128],'oasis.png':[160,160],'player_shadow.png':[64,64]},
 'compass':{'rotate':'needle relative player heading: -headingRadians; heading 0 = north, 90 = east','pivot':[64,64],'redEnd':'north', 'handheldDialOffsetNorth':[19,8], 'handheldNeedle':'render a separate tiny red 1x3px north-pointing line at rotated dial center; no baked needle'},
 'lighting':{'lampGlow':'draw at runtime from player position with Canvas radial gradient on low-res lighting layer','shadow':'shadow sprite transform away from sun at current local time'}
}
(ASSETS/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

# 9. visual previews, 480x270 logical and 1440x810 nearest-scaled

def backdrop(seed):
 canvas=Image.new('RGBA',(480,270),(0,0,0,255))
 for ty in range(-1,6):
  for tx in range(-1,9):
   idx=random.Random(1179+tx*12119+ty*8383+seed).randrange(16)
   tile=sand.crop(((idx%4)*64,(idx//4)*64,((idx%4)+1)*64,((idx//4)+1)*64)).convert('RGBA')
   _paste_clip(canvas,tile,tx*64-15,ty*64-17)
 rng=random.Random(seed)
 for _ in range(95):
  xx=rng.randrange(480); yy=rng.randrange(270)
  idx=rng.randrange(12)
  dec=details.crop(((idx%4)*32,(idx//4)*32,((idx%4)+1)*32,((idx//4)+1)*32))
  canvas.alpha_composite(dec,(xx,yy)) if xx+32<=480 and yy+32<=270 else _paste_clip(canvas,dec,xx,yy)
 return canvas

def _paste_clip(bg, tile, x,y):
 a=max(x,0);b=max(y,0);c=min(x+tile.width,bg.width);e=min(y+tile.height,bg.height)
 if c>a and e>b: bg.alpha_composite(tile.convert("RGBA").crop((a-x,b-y,c-x,e-y)),(a,b))

def composite_at(dst,img,x,y):_paste_clip(dst,img,round(x),round(y))

# Colors of raster draw by daypart, kept in actual page renderer too.
def make_preview(night=False):
 screen=backdrop(1297 if night else 2121)
 # Some footprints fading into the lower area.
 for i in range(10):
  xx=240+(i%2)*8-6-int(i*1.2);yy=160+i*15
  fp_icon=fp.crop(((i%2)*16,0,((i%2)+1)*16,16))
  composite_at(screen,fp_icon,xx,yy)
 # morning/evening shadow pointing due northwest
 if not night:
  s=shadow.resize((79,83),Image.Resampling.NEAREST)
  composite_at(screen,s,195,95)
 # turn avatar northeast to show the 8-dir sprite, yet centered in screen.
 avatar=(Image.open(ASSETS/('player_night.png' if night else 'player_day.png'))
         .crop((2*64,1*64,3*64,2*64)))
 composite_at(screen,avatar,208,103)
 # overlay held-compass needle; tiny needle points actual world North, not body forward.
 theta=math.pi/4
 dial_x=240+19*math.cos(theta)-8*math.sin(theta)
 dial_y=135+19*math.sin(theta)+8*math.cos(theta)
 d2=ImageDraw.Draw(screen)
 line(d2,[(round(dial_x),round(dial_y)-3),(round(dial_x),round(dial_y))],C['red'],1)
 # light/shadow overlay only over desert and character, keep bright compass overlay
 if night:
  shad=Image.new('RGBA',screen.size,(10,21,39,190))
  mask=Image.new('L',screen.size,190)
  mp=mask.load()
  # pixel radial falloff so light covers dune texture; slight elliptical patch
  for yy in range(270):
   for xx in range(480):
    dist=((xx-226)**2+(yy-141)**2)**0.5
    f=min(1,max(0,(dist-20)/105))
    mp[xx,yy]=int(25+180*(f**1.4))
  shad.putalpha(mask);screen=Image.alpha_composite(screen,shad)
  glow=Image.new('RGBA',screen.size,(0,0,0,0))
  gd=ImageDraw.Draw(glow)
  # warm lamp accents, concentric low-alpha discrete bands
  for radius,alpha in ((42,14),(30,26),(19,50),(9,70)):
   ellipse(gd,(218-radius,141-radius,218+radius,141+radius),(255,170,74,alpha))
  screen=Image.alpha_composite(screen,glow)
 # HUD compass sits above light layer (like magnified right-hand instrument)
 card=Image.new('RGBA',(139,151),(0,0,0,0))
 cd=ImageDraw.Draw(card)
 box(cd,(2,5,137,147),(26,31,33,230))
 box(cd,(4,7,135,145),(49,47,42,243))
 box(cd,(7,10,132,142),(63,53,41,236))
 cd.line([(14,18),(121,18)],fill=(195,148,78,180),width=1)
 compass=base.copy();cp=needle.rotate(+45,resample=Image.Resampling.NEAREST,center=(64,64));compass.alpha_composite(cp);compass.alpha_composite(glass)
 composite_at(card,compass,5,3)
 pixtext(card,(33,129),'BEARING 045°','#F4D9A7',scale=1)
 composite_at(screen,card,329,112)
 # title label
 box(ImageDraw.Draw(screen),(12,11,212,39),(40,40,34,204))
 pixtext(screen,(20,18),'DESERT FINDING','#FFF0C8',scale=2)
 pixtext(screen,(19,44),'A COMPASS. AN ENDLESS SEA.','#433C37' if not night else '#F8D7A9',scale=1)
 if night: pixtext(screen,(15,239),'23:42  /  NIGHT','#FCE1B2')
 else: pixtext(screen,(15,239),'16:18  /  AFTERNOON','#554C43')
 return screen

for flag in (False,True):
 pic=make_preview(flag)
 pic.resize((1440,810),Image.Resampling.NEAREST).save(ROOT/('preview_night.png' if flag else 'preview_day.png'),optimize=True)

# 10. contact sheet showcasing real sprites at 4x for inspection
sheet=Image.new('RGBA',(1080,720),(22,29,35,255));sd=ImageDraw.Draw(sheet)
pixtext(sheet,(35,23),'DESERT FINDING / PIXEL ASSET ATLAS','#F6D39A',scale=3)
pixtext(sheet,(36,69),'8 DIRECTIONS  /  6 WALK FRAMES  /  LIMITED PIXEL PALETTE','#A9B6AE',scale=1)
for src,x,y,name in [('player_day.png',35,108,'TRAVELER - DAY'),('player_night.png',420,108,'TRAVELER - NIGHT')]:
 atlas=Image.open(ASSETS/src)
 subset=atlas.crop((0,0,384,128)).resize((384,128),Image.Resampling.NEAREST)
 # first two directions by six frames at native scale
 composite_at(sheet,subset,x,y+24)
 pixtext(sheet,(x,y),name,'#F6D39A')
pixtext(sheet,(35,280),'SAND TILE PALETTE','#F6D39A')
composite_at(sheet,sand.resize((384,384),Image.Resampling.NEAREST),35,304)
pixtext(sheet,(450,280),'COMPASS / LAMP / OASIS','#F6D39A')
cp=base.copy();cp.alpha_composite(needle);cp.alpha_composite(glass)
composite_at(sheet,cp.resize((256,256),Image.Resampling.NEAREST),451,311)
composite_at(sheet,oas.resize((168,168),Image.Resampling.NEAREST),737,339)
pixtext(sheet,(450,601),'RED NEEDLE POINTS TRUE NORTH','#BCC9C0')
pixtext(sheet,(450,619),'SPRITES ARE ORIGINAL PNGS','#BCC9C0')
sheet.convert('RGB').save(ROOT/'asset_contact_sheet.png',optimize=True)

# file summary and integrity checks
required=['player_day.png','player_night.png','sand_tiles.png','sand_details.png','footprints.png','compass_base.png','compass_needle.png','compass_glass.png','oasis.png','player_shadow.png','manifest.json']
for n in required:assert (ASSETS/n).exists(),n
for n,size in [('player_day.png',(384,512)),('player_night.png',(384,512)),('sand_tiles.png',(256,256)),('sand_details.png',(128,96)),('compass_base.png',(128,128)),('compass_needle.png',(128,128))]:
 assert Image.open(ASSETS/n).size==size,n
for n in required:
 p=ASSETS/n
 print(n,p.stat().st_size,'bytes')
print('Asset validation PASS; preview_day.png, preview_night.png, asset_contact_sheet.png created')
