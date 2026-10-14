# Recorded instructor slots

No recordings are installed. The empty manifest deliberately exposes no recorded voices.
See docs/VOICE_RECORDING_UZ.md and docs/VOICE_RECORDING_LIST.csv.
Place consented real PCM16 mono24kHz WAV files under `<uz|ru|en>/<instructor-a|instructor-b>/<clip_id>.wav`.
Run `node --import tsx scripts/index-voice-clips.mjs` and rebuild. Never substitute the synthetic test tones for instructor speech.
