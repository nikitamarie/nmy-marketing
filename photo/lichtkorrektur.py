"""Lichtkorrektur für Fotos von der Behandlungsliege – im NMY-Look.

Was passiert (global, auf das ganze Bild – das Ergebnis selbst wird NICHT retuschiert):
  1. Ausrichtung korrigieren, Metadaten entfernen (u. a. GPS-Standort)
  2. Weißabgleich: Gelb-/Orangestich von Lampen neutralisieren (begrenzte Stärke)
  3. Helligkeit auf einen einheitlichen Zielwert bringen
  4. Sanfte Kontrastkurve + minimal warmer, ruhiger Brand-Ton
  5. Zuschnitt auf 4:5 (Feed) oder 9:16 (Story/Reel)

Bei Vorher/Nachher werden beide Bilder auf DENSELBEN Zielwert gebracht -> gleiches Licht,
fairer Vergleich. Keine Hautglättung, keine Formveränderung, kein Weichzeichner.

Aufruf:
  python3 photo/lichtkorrektur.py eingabe.jpg ausgabe.jpg [--format post|story|original] [--fokus 0.5,0.4]
"""
import argparse
import numpy as np
from PIL import Image, ImageOps

TARGET_MEDIAN = 0.56      # Ziel-Helligkeit der Bildmitte (Median der Luminanz, 0..1)
WB_STRENGTH = 0.55        # wie stark der Farbstich entfernt wird (1 = komplett)
WARM_TONE = (1.022, 1.0, 0.972)  # leichter warmer Brand-Ton (R, G, B)
VIBRANCE = 1.08           # Farbsättigung nach dem Weißabgleich
RATIOS = {"post": 4 / 5, "story": 9 / 16}


def _srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def _lin_to_srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def correct(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img).convert("RGB")
    a = np.asarray(img).astype(np.float32) / 255.0
    lin = _srgb_to_lin(a)

    # --- Weißabgleich (Gray-World auf Mitteltönen, ohne Lichter/Schatten) ---
    lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    lo, hi = np.quantile(lum, [0.15, 0.95])
    mask = (lum > lo) & (lum < hi)
    means = lin[mask].mean(axis=0) if mask.any() else lin.reshape(-1, 3).mean(axis=0)
    gray = means.mean()
    gains = gray / np.maximum(means, 1e-6)
    gains = 1 + (gains - 1) * WB_STRENGTH
    gains = np.clip(gains, 0.75, 1.35)
    lin = lin * gains

    # --- Belichtung: Median auf Zielwert (in sRGB gemessen), begrenzt ---
    srgb = _lin_to_srgb(lin)
    l_s = 0.2126 * srgb[..., 0] + 0.7152 * srgb[..., 1] + 0.0722 * srgb[..., 2]
    h, w = l_s.shape
    center = l_s[int(h * .2):int(h * .8), int(w * .2):int(w * .8)]  # Gesicht liegt meist mittig
    med = float(np.median(center))
    gamma = np.log(TARGET_MEDIAN) / np.log(max(min(med, 0.95), 0.05))
    gamma = float(np.clip(gamma, 0.75, 1.35))
    srgb = np.power(np.clip(srgb, 0, 1), gamma)

    # --- sanfte S-Kurve + Lichter schützen ---
    s = 0.18
    srgb = srgb + s * srgb * (1 - srgb) * (2 * srgb - 1)  # leichte Kontrastanhebung
    srgb = np.where(srgb > 0.92, 0.92 + (srgb - 0.92) * 0.6, srgb)   # weiches Abrollen der Lichter

    # --- dezente Lebendigkeit zurückgeben (kein „blasser“ Look) ---
    mean = srgb.mean(axis=2, keepdims=True)
    srgb = mean + (srgb - mean) * VIBRANCE

    # --- Brand-Ton ---
    srgb = srgb * np.array(WARM_TONE, dtype=np.float32)

    out = (np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def crop(img: Image.Image, fmt: str, focus=(0.5, 0.45)) -> Image.Image:
    if fmt not in RATIOS:
        return img
    r = RATIOS[fmt]
    w, h = img.size
    if w / h > r:   # zu breit
        nw = int(h * r)
        x = int(np.clip(focus[0] * w - nw / 2, 0, w - nw))
        box = (x, 0, x + nw, h)
    else:           # zu hoch
        nh = int(w / r)
        y = int(np.clip(focus[1] * h - nh / 2, 0, h - nh))
        box = (0, y, w, y + nh)
    out = img.crop(box)
    target_w = 1080
    if out.width > target_w:
        out = out.resize((target_w, round(target_w / r)), Image.LANCZOS)
    return out


def process(src, dst, fmt="post", focus=(0.5, 0.45)):
    img = correct(Image.open(src))
    img = crop(img, fmt, focus)
    img.save(dst, "JPEG", quality=92, optimize=True)  # ohne EXIF -> kein GPS
    return dst


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--format", default="post", choices=["post", "story", "original"])
    p.add_argument("--fokus", default="0.5,0.45", help="Bildmittelpunkt x,y (0..1) für den Zuschnitt")
    a = p.parse_args()
    fx, fy = (float(v) for v in a.fokus.split(","))
    print(process(a.src, a.dst, a.format, (fx, fy)))
