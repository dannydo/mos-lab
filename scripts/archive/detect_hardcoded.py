#!/usr/bin/env python3
import os
import re
import sys

# Regex to find hex colors (e.g., #ffffff, #abc)
HEX_COLOR_PATTERN = re.compile(r'#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b')
# Regex to find rgb/rgba colors (e.g., rgb(0,0,0), rgba(255, 255, 255, 0.5))
RGB_COLOR_PATTERN = re.compile(r'rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d\.]+)?\)')

# Paths to scan
TARGET_DIRS = [
    'apps/web/app',
    'apps/web/components'
]

# Files to ignore completely
IGNORE_FILES = []

# Exact line matches or color values that are allowed (exceptions)
# For example, seed token assignments in ConfigProvider/ThemeContext
ALLOWED_EXCEPTIONS = [
    '#D4A84B',  # The primary brand gold seed token
    '#FAAD14',  # Ant Design warning yellow for sun icon
    '#1890FF',  # Ant Design link blue for moon icon / Called status
    '#40A9FF',  # Called blue gradient secondary
    '#52C41A',  # Success green / Booked status
    '#FF4D4F',  # Error/danger red / Missed status
    '#722ED1',  # Checkin purple
    '#13C2C2',  # Busy status cyan
    '#F5222D',  # Wrong number status red
    '#8C8C8C',  # Others status grey
    '#FFEC3D',  # Gold gradient secondary
]

def scan_file(file_path):
    violations = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_idx, line in enumerate(f, 1):
                # Ignore comments
                clean_line = line.split('//')[0].split('/*')[0]
                
                # Check hex colors
                for match in HEX_COLOR_PATTERN.finditer(clean_line):
                    color = match.group(0)
                    if color.upper() not in ALLOWED_EXCEPTIONS:
                        # Ensure it's not part of a global CSS sheet styled under .dark-theme or .light-theme
                        # e.g., if the line starts with background or border and is inside global css
                        # but as a general guideline, inline hex colors are forbidden.
                        if 'style=' in clean_line or 'backgroundColor' in clean_line or 'borderColor' in clean_line:
                            violations.append((line_idx, f"Hardcoded inline hex color '{color}': {line.strip()}"))
                        elif '.dark-theme' not in clean_line and '.light-theme' not in clean_line:
                            # Catch general hardcoded style rules outside theme-scoped blocks
                            violations.append((line_idx, f"Hardcoded hex color '{color}' outside theme scopes: {line.strip()}"))

                # Check rgb/rgba colors
                for match in RGB_COLOR_PATTERN.finditer(clean_line):
                    color = match.group(0)
                    # Allow low opacity gold grid lines
                    if '212, 168, 75' in color:
                        continue
                    if 'style=' in clean_line or 'rgba' in clean_line:
                        violations.append((line_idx, f"Hardcoded rgb/rgba color '{color}': {line.strip()}"))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return violations

def main():
    workspace_root = os.getcwd()
    print(f"Scanning workspace: {workspace_root}")
    
    total_violations = 0
    scanned_files = 0

    for target_dir in TARGET_DIRS:
        full_dir_path = os.path.join(workspace_root, target_dir)
        if not os.path.exists(full_dir_path):
            continue
            
        for root, dirs, files in os.walk(full_dir_path):
            for file in files:
                if not file.endswith(('.tsx', '.ts', '.css')):
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, workspace_root)
                
                if rel_path in IGNORE_FILES:
                    continue
                
                scanned_files += 1
                violations = scan_file(file_path)
                
                if violations:
                    print(f"\n[VIOLATION] in file: {rel_path}")
                    for line_no, msg in violations:
                        print(f"  Line {line_no}: {msg}")
                    total_violations += len(violations)

    print("\n" + "="*50)
    print(f"Scan complete. Scanned {scanned_files} files.")
    if total_violations > 0:
        print(f"Found {total_violations} hardcoded color style issues!")
        sys.exit(1)
    else:
        print("Success! No hardcoded styles detected.")
        sys.exit(0)

if __name__ == '__main__':
    main()
