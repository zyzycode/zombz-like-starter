"""Repack selected official Flare character crops; requires Pillow and a source checkout/cache."""
from pathlib import Path
import argparse, json, re
from PIL import Image

REVISION = 'af6eee6d339ac98011864bfe89da837fe7769c28'
STATES = {'idle': 'stance', 'walk': 'run', 'attack': 'swing', 'cast': 'cast', 'hurt': 'hit', 'death': 'die'}
DIRECTIONS = ['down-left', 'left', 'up-left', 'up', 'up-right', 'right', 'down-right', 'down']
LAYERS = {
    'main': ['longsword'], 'feet': ['plate_boots'], 'legs': ['plate_greaves'],
    'hands': ['plate_gauntlets'], 'chest': ['plate_cuirass'], 'off': ['shield'],
    'head': ['head_short', 'plate_helm'],
}
ORDERS = [
    ['main','feet','legs','hands','chest','off','head'],
    ['main','feet','legs','hands','chest','off','head'],
    ['main','feet','legs','hands','chest','off','head'],
    ['feet','legs','hands','chest','off','head','main'],
    ['feet','legs','hands','chest','off','head','main'],
    ['feet','legs','hands','chest','off','head','main'],
    ['feet','legs','hands','main','chest','head','off'],
    ['main','feet','legs','hands','chest','head','off'],
]

def parse(source, name):
    data = {'images': {}, 'states': {}}
    current = None
    for line in (source/'mods/fantasycore/animations'/f'{name}.txt').read_text().splitlines():
        if line.startswith('image='):
            path, *key = line[6:].split(',')
            data['images'][key[0] if key else 'default'] = source/'mods/fantasycore'/path
        elif line.startswith('['):
            current = line[1:-1]; data['states'][current] = {'frames': {}}
        elif current and line.startswith('frame='):
            values = line[6:].split(','); nums = list(map(int, values[:8]))
            data['states'][current]['frames'][(nums[0], nums[1])] = (nums[2:], values[8] if len(values)>8 else 'default')
        elif current and line.startswith('frames='):
            data['states'][current]['count'] = int(line[7:])
        elif current and line.startswith('duration='):
            data['states'][current]['durationMs'] = int(re.sub(r'\D','',line[9:]))
    return data

def crop(data, state, index, direction):
    values, key = data['states'][state]['frames'][(index, direction)]
    x,y,w,h,ox,oy = values
    if isinstance(data['images'][key], Path):
        data['images'][key] = Image.open(data['images'][key]).convert('RGBA')
    return data['images'][key].crop((x,y,x+w,y+h)), ox, oy

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--source-root',type=Path,required=True)
    args=parser.parse_args();root=Path(__file__).resolve().parents[1]
    out=root/'public/assets/flare/characters';out.mkdir(parents=True,exist_ok=True)
    hero={part:parse(args.source_root,'avatar/male/'+part) for parts in LAYERS.values() for part in parts}
    roles = {'hero': (hero, .3333333333, 384, (192,256)),
             'grunt': (parse(args.source_root,'enemies/skeleton'), .3333333333, 384,(192,256)),
             'runner': (parse(args.source_root,'enemies/goblin'), .5,384,(192,256)),
             'ranged': (parse(args.source_root,'enemies/skeleton_mage'), .3333333333,384,(192,256)),
             'brute': (parse(args.source_root,'enemies/minotaur'), .375,512,(256,384)),
             'boss': (parse(args.source_root,'enemies/wyvern'), .5,512,(256,384))}
    manifest={}
    for role,(data,scale,canvas,anchor) in roles.items():
        cell=round(canvas*scale); metadata=next(iter(data.values())) if role=='hero' else data
        info={'cell':cell,'origin':{'x':anchor[0]/canvas,'y':anchor[1]/canvas},'states':{}}
        for state,original in STATES.items():
            if role=='brute' and state=='cast': original='swing' # No extra unused caster atlas.
            if role=='ranged' and state=='attack': original='cast'
            source_state=metadata['states'][original]
            count=source_state['count'];sheet=Image.new('RGBA',(cell*count,cell*8))
            for direction in range(8):
                for index in range(count):
                    frame=Image.new('RGBA',(canvas,canvas))
                    parts=[part for layer in ORDERS[direction] for part in LAYERS[layer]] if role=='hero' else [None]
                    for part in parts:
                        art,ox,oy=crop(data[part] if part else data,original,index,direction)
                        assert anchor[0]-ox>=0 and anchor[1]-oy>=0 and anchor[0]-ox+art.width<=canvas and anchor[1]-oy+art.height<=canvas,(role,state,index,direction,'clipped')
                        frame.alpha_composite(art,(anchor[0]-ox,anchor[1]-oy))
                    frame=frame.resize((cell,cell),Image.LANCZOS)
                    assert frame.getbbox(),(role,state,index,direction,'empty')
                    sheet.alpha_composite(frame,(index*cell,direction*cell))
            sheet.save(out/f'{role}-{state}.png',optimize=True)
            info['states'][state]={'count':count,'fps':round(count/source_state['durationMs']*1000,2)}
        manifest[role]=info
    obelisk=parse(args.source_root,'npcs/return_obelisk1')
    sheet=Image.new('RGBA',(128*6,128))
    for index in range(6):
        art,ox,oy=crop(obelisk,'stance',index,0)
        art=art.resize((round(art.width*.4),round(art.height*.4)),Image.LANCZOS)
        sheet.alpha_composite(art,(index*128+64-round(ox*.4),96-round(oy*.4)))
    sheet.save(out/'restoration.png',optimize=True)
    (out/'manifest.json').write_text(json.dumps({'revision':REVISION,'directions':DIRECTIONS,'characters':manifest},indent=2)+'\n')
    print('Repacked six Flare characters, eight directions each, and restoration obelisk.')

if __name__=='__main__':main()
