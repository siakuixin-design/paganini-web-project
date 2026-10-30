#!/usr/bin/env python3
"""Audit bundled simplified rhythm charts against decoded audio.
Requires ffmpeg, ffprobe and NumPy. Does not infer pitch or rewrite note times.
"""
import argparse
import json
from pathlib import Path
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]

def analyze(audio_path, chart_path):
    chart = json.loads(chart_path.read_text())
    events = chart if isinstance(chart, list) else chart['events']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(audio_path), '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'], check=True, capture_output=True).stdout
    samples = np.frombuffer(raw, dtype='<f4')
    sr, nfft, hop = 22050, 1024, 512
    frames = np.lib.stride_tricks.sliding_window_view(samples, nfft)[::hop]
    spectrum = np.abs(np.fft.rfft(frames * np.hanning(nfft), axis=1))
    # Positive spectral flux is an onset proxy, not a beat or score transcription.
    flux = np.maximum(np.diff(np.log1p(spectrum), axis=0), 0).sum(axis=1)
    peaks = np.flatnonzero((flux[1:-1] > flux[:-2]) & (flux[1:-1] >= flux[2:])) + 1
    strong = peaks[flux[peaks] >= np.percentile(flux[peaks], 40)]
    times = (strong * hop + nfft / 2 + hop) / sr
    differences = [round(float(times[np.argmin(np.abs(times - float(e['t'])))] - float(e['t'])), 4) for e in events]
    duration = len(samples) / sr
    bad = [e for e in events if not (0 <= float(e['t']) < duration and int(e['lane']) in (0, 1, 2))]
    if bad:
        raise ValueError(f'{chart_path}: events outside audio or invalid lane: {bad}')
    if any(float(a['t']) >= float(b['t']) for a, b in zip(events, events[1:])):
        raise ValueError(f'{chart_path}: events not strictly ordered')
    return {
        'audio': audio_path.name, 'chart': chart_path.name,
        'decodedDurationSeconds': round(duration, 4), 'sampleRate': sr,
        'noteCount': len(events), 'maximumScore': len(events) * 100,
        'passScore': len(events) * 80,
        'firstNoteSeconds': events[0]['t'], 'lastNoteSeconds': events[-1]['t'],
        'validEvents': True, 'fullDecodePassed': True,
        'onsetAnalysis': {
            'method': '1024-sample Hann FFT, 512-sample hop; positive log-spectrum flux; local maxima above 40th percentile',
            'meaning': 'Transient proximity evidence only; polyphonic recordings, legato and ornaments need human listening. Not a beat, pitch or score verification.',
            'medianAbsoluteNearestTransientSeconds': round(float(np.median(np.abs(differences))), 4),
            'within135Milliseconds': sum(abs(x) <= .135 for x in differences),
            'signedNearestTransientOffsetsSeconds': differences,
        },
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = {
        'type': 'simplified-onset-chart-audit',
        'notAnOriginalScore': True,
        'charts': [analyze(p, p.with_suffix('.json')) for p in sorted((ROOT / 'assets/audio/game').glob('*.mp3'))],
    }
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(text)
    print(text)
