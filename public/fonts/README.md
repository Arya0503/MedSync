# Self-Hosted Fonts

MedBridge strictly conforms to Constraint 7 (Zero External Network Requests):
- No external CDNs or Google Fonts are ever contacted.
- Fonts are resolved locally:
  - **Headings**: Newsreader (Editorial Serif)
  - **Interface**: Public Sans (Legible Sans-Serif)
  - **Doses, Record Numbers, Codes**: IBM Plex Mono (Monospace with Tabular Numerals)
- Fallbacks are carefully calibrated to ensure 0 layout shift and complete offline capability.
