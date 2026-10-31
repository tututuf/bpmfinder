from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
image = Image.new('RGB', (1200, 630), '#141414')
draw = ImageDraw.Draw(image)
def font(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf', size)

draw.line((60, 66, 1140, 66), fill='#46443f', width=1)
draw.text((60, 29), 'BPM FINDER / AUDIO TOOLS', font=font(17, True), fill='#A5CFE3')
draw.text((60, 133), 'Know your', font=font(74, True), fill='#F4F1EA')
draw.text((60, 218), 'music.', font=font(88, True), fill='#FF756B')
draw.text((64, 351), 'Tempo. Key. Your next good mix.', font=font(26), fill='#C4C2B9')
draw.rounded_rectangle((64, 441, 240, 490), radius=8, fill='#FF756B')
draw.text((85, 454), 'BPM FINDER', font=font(19, True), fill='#141414')
draw.text((65, 555), 'bpmfder.com', font=font(18), fill='#B9B7B0')
draw.rounded_rectangle((746, 116, 1118, 488), radius=5, fill='#A5CFE3')
draw.ellipse((781, 151, 1083, 453), fill='#141414')
for r in range(80, 146, 10):
    draw.ellipse((932-r, 302-r, 932+r, 302+r), outline='#393936', width=1)
draw.ellipse((878, 248, 986, 356), fill='#FF756B')
draw.text((900, 281), '120', font=font(29, True), fill='#141414')
draw.text((907, 316), 'BPM', font=font(13, True), fill='#141414')
draw.text((763, 131), 'SIDE A / FIND THE PULSE', font=font(12, True), fill='#141414')
draw.ellipse((710, 457, 825, 572), fill='#EED77B')
draw.text((741, 484), '8A', font=font(34, True), fill='#141414')
draw.text((733, 528), 'A MINOR', font=font(12, True), fill='#141414')
target = root / 'public/images/bpm-finder-social.png'
image.save(target, optimize=True)
print(f'{target}: {image.size}, {target.stat().st_size} bytes')
