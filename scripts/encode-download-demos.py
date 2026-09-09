from PIL import Image
from pathlib import Path
root=Path('work/site-frames')
out=Path('docs/assets/demos')
for directory in sorted(root.iterdir()):
    if not directory.is_dir(): continue
    sources=[Image.open(p).convert('RGB') for p in sorted(directory.glob('*.png'))]
    width=max(i.width for i in sources); height=max(i.height for i in sources)
    scale=min(1,850/width)
    frames=[]
    for im in sources:
        canvas=Image.new('RGB',(width,height),im.getpixel((0,0)))
        canvas.paste(im,((width-im.width)//2,0))
        canvas=canvas.resize((round(width*scale),round(height*scale)),Image.Resampling.LANCZOS)
        frames.append(canvas)
    frames[0].save(out/(directory.name+'-poster.png'),optimize=True)
    pal=frames[0].quantize(colors=128)
    indexed=[f.quantize(palette=pal,dither=Image.Dither.NONE) for f in frames]
    target=out/(directory.name+'.gif')
    indexed[0].save(target,save_all=True,append_images=indexed[1:],duration=500,loop=0,optimize=True,disposal=1)
    with Image.open(target) as gif:
        duration=0
        for n in range(gif.n_frames):
            gif.seek(n);duration+=gif.info['duration']
        print(directory.name,len(frames),gif.n_frames,gif.size,duration,target.stat().st_size)
