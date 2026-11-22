"""Eigene, lizenzfreie Hintergrundmusik für NMY-Reels (per Code komponiert, keine fremden Samples).

Ruhiger, hochwertiger "Spa"-Sound: weiche Flächen, sanftes E-Piano-Arpeggio, warmer Bass, Hall.
Jeder Titel ist 64 Sekunden lang und loopt sauber (die App kürzt/blendet passend zum Video).

Aufruf: python3 scripts/musik.py <ausgabeordner>
"""
import sys
import os
import subprocess
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

SR = 44100
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(name):  # z. B. "A4"
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)


def env_adsr(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, sustain, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def pad(freqs, dur, rng):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros((len(t), 2))
    for f in freqs:
        for side, det in ((0, -0.18), (1, 0.18)):  # leicht verstimmt -> breiter, weicher Klang
            ff = f * 2 ** (det / 1200 * 10)
            ph = rng.uniform(0, 2 * np.pi)
            tone = np.sin(2 * np.pi * ff * t + ph) + 0.18 * np.sin(4 * np.pi * ff * t + ph) + 0.05 * np.sin(6 * np.pi * ff * t)
            lfo = 1 + 0.08 * np.sin(2 * np.pi * rng.uniform(0.07, 0.15) * t + ph)
            out[:, side] += tone * lfo
    out *= env_adsr(len(t), 1.6, 1.8)[:, None] / (len(freqs) * 2.4)
    return out


def epiano(f, dur, vel):
    t = np.arange(int(dur * SR)) / SR
    parts = [(1, 1.0, 1.6), (2, 0.45, 0.8), (3, 0.2, 0.5), (4.02, 0.1, 0.3), (5.03, 0.05, 0.2), (7.1, 0.025, 0.12)]  # (Harmonische, Lautstärke, Abklingzeit)
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / tau) for k, a, tau in parts)
    s *= env_adsr(len(t), 0.006, 0.08)
    return s * vel


def bass(f, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)
    return s * env_adsr(len(t), 0.25, 0.6, 0.9) * 0.5


def reverb(x, wet=0.28):
    """Schroeder-Hall (4 Kammfilter + 2 Allpass) pro Kanal"""
    out = np.zeros_like(x)
    for ch, spread in ((0, 0), (1, 23)):
        sig = x[:, ch]
        acc = np.zeros_like(sig)
        for d, g in ((1557, 0.84), (1617, 0.83), (1491, 0.85), (1422, 0.86)):
            d += spread
            b = np.zeros(d + 1); b[d] = 1
            a = np.zeros(d + 1); a[0] = 1; a[d] = -g
            acc += lfilter(b, a, sig)
        acc /= 4
        for d, g in ((225, 0.5), (556, 0.5)):
            b = np.zeros(d + 1); b[0] = -g; b[d] = 1
            a = np.zeros(d + 1); a[0] = 1; a[d] = -g
            acc = lfilter(b, a, acc)
        out[:, ch] = acc
    lp = butter(2, 6000, fs=SR, output='sos')
    return (1 - wet) * x + wet * sosfilt(lp, out, axis=0)


TRACKS = [
    # Name, BPM, Akkorde (je 1 Takt = 4 Schläge), Bass, Arpeggio-Muster (Index in Akkord, -1 = Pause)
    ('ruhe', 60, [['C4', 'E4', 'G4', 'B4'], ['A3', 'C4', 'E4', 'G4'], ['F3', 'A3', 'C4', 'E4'], ['G3', 'B3', 'D4', 'E4']],
     ['C2', 'A1', 'F1', 'G1'], [0, 2, 3, 2, 1, -1, 2, 3]),
    ('seide', 58, [['D4', 'F#4', 'A4', 'C#5'], ['B3', 'D4', 'F#4', 'A4'], ['G3', 'B3', 'D4', 'F#4'], ['A3', 'C#4', 'E4', 'F#4']],
     ['D2', 'B1', 'G1', 'A1'], [0, -1, 2, 3, 1, 2, -1, 3]),
    ('morgenlicht', 66, [['F3', 'A3', 'C4', 'E4'], ['D3', 'F3', 'A3', 'E4'], ['A#3', 'D4', 'F4', 'A4'], ['C4', 'E4', 'G4', 'A4']],
     ['F1', 'D2', 'A#1', 'C2'], [0, 1, 2, 3, 2, 1, -1, -1]),
    ('glow', 62, [['A3', 'C4', 'E4', 'B4'], ['F3', 'A3', 'C4', 'E4'], ['C4', 'E4', 'G4', 'B4'], ['G3', 'B3', 'D4', 'G4']],
     ['A1', 'F1', 'C2', 'G1'], [2, -1, 3, 1, -1, 2, 0, -1]),
]


def render(name, bpm, chords, basses, pattern, seed):
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    bar = 4 * beat
    bars = int(np.ceil(64 / bar))
    total = int(bars * bar * SR) + SR * 4
    mix = np.zeros((total, 2))
    for b in range(bars):
        ch = chords[b % len(chords)]
        start = int(b * bar * SR)
        p = pad([hz(n) for n in ch], bar + 1.8, rng)
        mix[start:start + len(p)] += p * 0.7
        sh = pad([hz(n) * 2 for n in ch[1:]], bar + 1.8, rng)  # „Glanz“ eine Oktave höher
        mix[start:start + len(sh)] += sh * 0.22
        bs = bass(hz(basses[b % len(basses)]), bar)
        mix[start:start + len(bs), 0] += bs * 0.16
        mix[start:start + len(bs), 1] += bs * 0.16
        if b >= 1:  # Arpeggio setzt nach dem ersten Takt ein
            for k, idx in enumerate(pattern):
                if idx < 0 or rng.random() < 0.12:
                    continue
                f = hz(ch[idx]) * 2  # eine Oktave höher
                note = epiano(f, 2.2, rng.uniform(0.32, 0.48))
                s = start + int(k * beat / 2 * SR) + int(rng.normal(0, 0.006) * SR)  # leicht menschliches Timing
                pan = rng.uniform(0.35, 0.65)
                e = min(total, s + len(note))
                mix[s:e, 0] += note[:e - s] * (1 - pan)
                mix[s:e, 1] += note[:e - s] * pan
    mix = reverb(mix)
    mix = mix[: int(64 * SR)]
    hp = butter(2, 70, btype='high', fs=SR, output='sos')  # Handy-Lautsprecher: kein Tiefbass-Matsch
    mix = sosfilt(hp, mix, axis=0)
    mix = np.tanh(mix * 1.2) / 1.2  # sanfte Sättigung statt hartem Clipping
    rms = np.sqrt(np.mean(mix ** 2))
    mix *= 10 ** (-20 / 20) / max(rms, 1e-9)  # ca. -20 dBFS RMS: ruhig, Hintergrund
    peak = np.max(np.abs(mix))
    if peak > 0.89:
        mix *= 0.89 / peak
    return mix


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for i, (name, bpm, chords, basses, pattern) in enumerate(TRACKS):
        mix = render(name, bpm, chords, basses, pattern, seed=100 + i)
        pcm = (mix * 32767).astype('<i2').tobytes()
        dst = os.path.join(out_dir, f'{name}.m4a')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', dst], input=pcm, check=True)
        print(dst, f'{os.path.getsize(dst) / 1024:.0f} KB', f'Peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'musik')
