# Synthetic image fixtures

Original test geometry only; no photographs or personal images.

- orientation-6.jpg: raw 80×40 JPEG with four RGB blocks; EXIF orientation 6 requires clockwise 90-degree normalization. Raw top-left red/top-right green/bottom-left blue/bottom-right yellow; normalized top-left blue/top-right red/bottom-left yellow/bottom-right green.
- transparency.png: transparent 80×40 canvas with a dark central square. Prepared white background must be opaque.

Generated with Pillow using solid rectangles. These establish input/crop behavior, not portrait quality or face detection.
