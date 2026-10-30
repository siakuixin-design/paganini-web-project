# Recording-aligned score data

The works page preserves its twelve existing MP3 recordings, record buttons, playback/seek controls, descriptions and listening notes. `assets/js/works-score.js` attaches an `AnalyserNode` to the same media element already owned by each record. It never starts a second recording. The canvas shows actual PCM waveform or FFT frequency magnitudes; pause stops the animation and seeking uses the media's current time. The right-hand sound control continues to stop playback through the existing audio bus.

No verified MIDI, MusicXML or recording-aligned note map was supplied. Accordingly, all entries in `assets/data/score-manifest.json` are `null`; the interface explicitly says that a waveform is not a musical score. Automatic rhythm-game onset analysis is not a substitute for this missing notation.

To add a real excerpt, replace only its matching recording entry with version 1 data:

```json
{
  "version": 1,
  "verified": true,
  "recording": "cantabile.mp3",
  "source": "Edition, page, bars, licence and person/date of alignment verification",
  "notes": [
    { "time": 12.3, "duration": 0.45, "midi": 76 }
  ]
}
```

The numbers above illustrate the schema only and are **not** a transcription of Cantabile. Do not copy them into production as real notes. Obtain a licensed/public-domain score or MIDI, identify the precise excerpt in the bundled recording, and manually check timing against the actual performance, including rubato, lead-in silence and repeats. Export times and durations in seconds from the start of that exact MP3 and MIDI pitch numbers as integers 21–108. Include a source reference and mark `verified: true` only after that work. The runtime rejects unverified, empty, invalid or mismatched-recording entries.

The current renderer is a timed pitch-marker view on five reference lines, not a full notation engraver (it does not claim to engrave rhythm values, accidentals, clefs or polyphonic voices). A verified excerpt highlights pitch markers at `audio.currentTime`, including after pause and seek. Full printed notation can later use a local MusicXML renderer with the same timeline data. `window.PaganiniScore.setScore(filename, data)` permits loading a checked excerpt at runtime; source references are inserted as text, never HTML.

Browser checks should cover all twelve original media elements, record exclusivity, seek, waveform/FFT changes and pause. Listening quality, speaker output and musical accuracy of future imported scores still require a person to check the recording.
