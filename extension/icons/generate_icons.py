"""
Generate simple placeholder PNG icons for the extension.
Run this script to create icon files or use an image editor with the SVG.
"""

# For production, convert the SVG to PNG using tools like:
# - ImageMagick: convert -background none icon128.svg -resize 16x16 icon16.png
# - Online converters: cloudconvert.com, svgtopng.com
# - Image editors: GIMP, Photoshop, Figma

# Simple Base64 encoded 1x1 green pixel PNG for placeholder
# Replace these with actual icons before publishing

PLACEHOLDER_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

import base64
import os

def create_placeholder_icons():
    """Create placeholder PNG files (1x1 green pixel)"""
    sizes = [16, 32, 48, 128]
    icon_dir = os.path.dirname(os.path.abspath(__file__))
    
    png_data = base64.b64decode(PLACEHOLDER_PNG_BASE64)
    
    for size in sizes:
        filename = os.path.join(icon_dir, f"icon{size}.png")
        with open(filename, 'wb') as f:
            f.write(png_data)
        print(f"Created {filename}")

if __name__ == "__main__":
    create_placeholder_icons()
    print("\nPlaceholder icons created!")
    print("For production, replace these with properly sized PNG icons from the SVG.")
