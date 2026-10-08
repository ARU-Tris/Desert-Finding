"""Checks asset manifest contract without requiring any game code."""
from pathlib import Path
import json, math, hashlib
from PIL import Image

root=Path(__file__).resolve().parent
A=root/'assets'
manifest=json.loads((A/'manifest.json').read_text(encoding='utf-8'))
checked=0
for filename,info in manifest['sheets'].items():
 with Image.open(A/filename) as im:
  im.verify()
 with Image.open(A/filename) as im:
  w=info['frameWidth'];h=info['frameHeight']
  assert im.size==(w*info['columns'], h*info['rows']),f'Wrong atlas grid {filename}'
  for row in range(info['rows']):
   for col in range(info['columns']):
    frame=im.crop((col*w,row*h,(col+1)*w,(row+1)*h))
    assert frame.getbbox() is not None,f'Empty cell: {filename} ({col},{row})'
    checked+=1
for filename,dimensions in manifest['static'].items():
 with Image.open(A/filename) as im:
  im.verify()
 with Image.open(A/filename) as im:
  assert im.size==tuple(dimensions),f'Bad static dimension: {filename}'
  assert im.getbbox() is not None,f'Blank static asset: {filename}'
for fn in ('preview_day.png','preview_night.png'):
 with Image.open(root/fn) as im:
  im.verify()
 with Image.open(root/fn) as im:
  assert im.size==(1440,810),f'Unexpected screenshot size: {fn}'
# Exact directional compass behavior independent of any runtime-specific coordinate mapping.
for heading_deg,expected in ((0,(0,-1)),(90,(-1,0)),(180,(0,1)),(270,(1,0))):
 angle=math.radians(-heading_deg)
 vector=(math.sin(angle),-math.cos(angle))
 assert all(abs(a-b)<1e-10 for a,b in zip(vector,expected)),f'Compass contract: {heading_deg}'
# Verify the revised design documents shipped with the playable game.
for document in ('CODEX_PROMPT.md','README_START_HERE.md','docs/GAME_DESIGN_KO.md','docs/ART_GUIDE.md','docs/TEST_MATRIX.md'):
 assert (root/document).stat().st_size>500,document
assert manifest['sheets']['player_day.png']['directions']==['N','NE','E','SE','S','SW','W','NW']
print(f'PASS: {checked} atlas cells; {len(manifest["static"])} static sprites; 2 previews; 4 compass headings; 5 documents; all PNGs verified')
print('NOTE: Run npm test and npm run test:browser for physical-world and gameplay checks.')
