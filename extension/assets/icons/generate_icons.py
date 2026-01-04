"""
Generate Extension Icons
Creates placeholder icons for the Phish-Block extension in multiple sizes
"""

from PIL import Image, ImageDraw, ImageFont

def create_shield_icon(size, color, filename):
    """Create a shield icon with specified size and color"""
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate proportions
    margin = size // 8
    shield_width = size - (margin * 2)
    shield_height = int(shield_width * 1.2)
    
    # Shield coordinates
    top = margin
    bottom = min(top + shield_height, size - margin)
    left = margin
    right = size - margin
    middle_x = size // 2
    point_y = size - margin
    
    # Draw shield shape
    points = [
        (middle_x, top),  # Top center
        (right, top + shield_width // 4),  # Top right
        (right, bottom - shield_width // 3),  # Bottom right
        (middle_x, point_y),  # Bottom point
        (left, bottom - shield_width // 3),  # Bottom left
        (left, top + shield_width // 4),  # Top left
    ]
    
    # Draw filled shield
    draw.polygon(points, fill=color, outline=color)
    
    # Draw checkmark
    check_color = (255, 255, 255, 255)
    check_width = max(2, size // 16)
    
    check_start_x = middle_x - shield_width // 4
    check_start_y = middle_x
    check_mid_x = middle_x - shield_width // 8
    check_mid_y = check_start_y + shield_width // 6
    check_end_x = middle_x + shield_width // 3
    check_end_y = check_start_y - shield_width // 6
    
    draw.line([(check_start_x, check_start_y), (check_mid_x, check_mid_y)], 
              fill=check_color, width=check_width)
    draw.line([(check_mid_x, check_mid_y), (check_end_x, check_end_y)], 
              fill=check_color, width=check_width)
    
    img.save(filename)
    print(f"Created {filename}")

def main():
    # Main icon color (blue)
    blue_color = (52, 152, 219, 255)  # #3498db
    
    # Generate icons in required sizes
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        create_shield_icon(size, blue_color, f'icon{size}.png')
    
    # Also create alternate colors for status indication
    green_color = (46, 204, 113, 255)  # Safe
    yellow_color = (241, 196, 15, 255)  # Warning
    red_color = (231, 76, 60, 255)  # Danger
    grey_color = (149, 165, 166, 255)  # Disabled
    
    create_shield_icon(128, green_color, 'icon-green.png')
    create_shield_icon(128, yellow_color, 'icon-yellow.png')
    create_shield_icon(128, red_color, 'icon-red.png')
    create_shield_icon(128, grey_color, 'icon-grey.png')
    
    print("\n✅ All icons generated successfully!")

if __name__ == '__main__':
    main()
