"""
Builds the membership card artwork from source-card.jpg (the approved card design).

  python3 scripts/membership-card/build-assets.py      (needs Pillow, fonttools and brotli)

Outputs:
  public/membership/card.jpg          the blank card, for the in-app card (text is laid over it)
  public/membership/email-top.jpg     the email hero above the personalised band
  public/membership/email-bottom.jpg  the email hero below it
  public/membership/card-font.woff2   the card lettering font for the app (Cormorant Garamond
                                      Medium, capitals and figures, lining figures built in so
                                      canvas downloads match the email)
  src/lib/membership-card/assets.generated.ts
      the personalised band's blank background and two glyph atlases (Cormorant Garamond,
      SIL Open Font License), so the server can draw a member's name, code and date with
      no image library (it runs on Cloudflare Workers).

The sample name and code printed on the source design are covered with neighbouring stone
texture first. Layout numbers live in src/aetheris/membership-card-layout.ts; keep CARD_BOX and
the sizes below in step with it.
"""
import base64
import io
import json
import os
import struct
import zlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SOURCE = os.path.join(HERE, 'source-card.jpg')
FONT = os.path.join(HERE, 'CormorantGaramond.ttf')

# The card inside the source photo (pixels). Must match CARD_BOX in membership-card-layout.ts.
CARD_BOX = (141, 169, 1307, 830)
# The sample name and code on the source design, covered before anything is drawn.
TEXT_PATCH = (192, 588, 650, 768)
# Email hero width, and the rows of it (in source pixels) that hold the personalised text.
EMAIL_WIDTH = 1200
BAND = (580, 776)
# Type sizes on the card, in card pixels (card width 1166). Match TYPE_SIZES in the layout.
ATLAS_SIZES = {'large': 38, 'medium': 30, 'small': 18}
CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,'&/"


def clean_source():
    im = Image.open(SOURCE).convert('RGB')
    x0, y0, x1, y1 = TEXT_PATCH
    h = y1 - y0
    patch = im.crop((x0, y0 - h - 4, x1, y0 - 4))
    mask = Image.new('L', (x1 - x0, h), 0)
    ImageDraw.Draw(mask).rectangle((8, 8, x1 - x0 - 8, h - 8), fill=255)
    im.paste(patch, (x0, y0), mask.filter(ImageFilter.GaussianBlur(4)))
    return im


def png_bytes(raw, width, height, channels):
    """Minimal PNG writer with filter 0 on every row, so the server's decoder stays tiny."""
    color = {1: 0, 3: 2}[channels]
    stride = width * channels
    rows = b''.join(b'\x00' + raw[y * stride:(y + 1) * stride] for y in range(height))

    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, color, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b''))


def atlas(size, weight):
    font = ImageFont.truetype(FONT, size=size, layout_engine=ImageFont.Layout.RAQM)
    font.set_variation_by_axes([weight])
    lining = ['lnum']  # capital-height figures, as on the card design
    ascent, descent = font.getmetrics()
    height = ascent + descent + 2
    glyphs, cells, x = {}, [], 0
    for ch in CHARSET:
        advance = font.getlength(ch, features=lining)
        left, _, right, _ = font.getbbox(ch, features=lining) if ch != ' ' else (0, 0, 0, 0)
        left = min(0, left)
        width = max(1, int(right - left) + 2)
        cells.append((ch, x, width, left))
        glyphs[ch] = [x, width, round(advance, 2), left]
        x += width + 1
    img = Image.new('L', (x, height), 0)
    draw = ImageDraw.Draw(img)
    for ch, cx, _, left in cells:
        if ch != ' ':
            draw.text((cx - left, 1), ch, font=font, fill=255, features=lining)
    _, cap_top, _, baseline = font.getbbox('H')
    return {'png': png_bytes(img.tobytes(), img.width, img.height, 1), 'size': size, 'width': img.width,
            'height': height, 'capTop': cap_top + 1, 'baseline': baseline + 1, 'glyphs': glyphs}


def card_font(path):
    """Cormorant Garamond Medium, reduced to the card's characters, with lining figures as the defaults."""
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    font = instantiateVariableFont(TTFont(FONT), {'wght': 500})
    lining = {}
    for record in font['GSUB'].table.FeatureList.FeatureRecord:
        if record.FeatureTag != 'lnum':
            continue
        for index in record.Feature.LookupListIndex:
            for sub in font['GSUB'].table.LookupList.Lookup[index].SubTable:
                lining.update(getattr(sub, 'mapping', {}) or {})
    for table in font['cmap'].tables:
        for code, glyph in list(table.cmap.items()):
            if glyph in lining:
                table.cmap[code] = lining[glyph]
    options = Options()
    options.flavor = 'woff2'
    options.layout_features = ['kern']
    options.name_IDs = ['*']
    subsetter = Subsetter(options)
    subsetter.populate(text=CHARSET)
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(path)


def main():
    im = clean_source()
    out = os.path.join(ROOT, 'public', 'membership')
    os.makedirs(out, exist_ok=True)
    im.crop(CARD_BOX).save(os.path.join(out, 'card.jpg'), quality=88, optimize=True, progressive=True)
    card_font(os.path.join(out, 'card-font.woff2'))

    scale = EMAIL_WIDTH / im.width
    hero = im.resize((EMAIL_WIDTH, round(im.height * scale)), Image.LANCZOS)
    top, bottom = round(BAND[0] * scale), round(BAND[1] * scale)
    hero.crop((0, 0, EMAIL_WIDTH, top)).save(os.path.join(out, 'email-top.jpg'), quality=86, optimize=True, progressive=True)
    hero.crop((0, bottom, EMAIL_WIDTH, hero.height)).save(os.path.join(out, 'email-bottom.jpg'), quality=86, optimize=True, progressive=True)
    band = hero.crop((0, top, EMAIL_WIDTH, bottom))

    atlases = {name: atlas(size * scale, 500) for name, size in ATLAS_SIZES.items()}
    meta = {
        'scale': scale, 'bandTop': top, 'width': EMAIL_WIDTH, 'height': bottom - top,
        'atlases': {name: {k: v for k, v in a.items() if k != 'png'} for name, a in atlases.items()},
    }
    b64 = lambda data: base64.b64encode(data).decode('ascii')
    ts = (
        '// Generated by scripts/membership-card/build-assets.py. Do not edit by hand.\n'
        '/* eslint-disable */\n'
        f'export const BAND_META = {json.dumps(meta, separators=(",", ":"))} as const\n'
        f'export const BAND_PNG = "{b64(png_bytes(band.tobytes(), band.width, band.height, 3))}"\n'
        f'export const ATLAS_PNG = {json.dumps({name: b64(a["png"]) for name, a in atlases.items()})} as const\n'
    )
    with open(os.path.join(ROOT, 'src', 'lib', 'membership-card', 'assets.generated.ts'), 'w') as fh:
        fh.write(ts)
    print('band', band.size, 'ts bytes', len(ts))


if __name__ == '__main__':
    main()
