#!/bin/bash

# Script to export entire codebase as a single file
# Excludes common build/dependency directories

OUTPUT_FILE="codebase_export.txt"
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    ".next"
    "dist"
    "build"
    "coverage"
    ".nyc_output"
    "*.log"
    ".DS_Store"
    "Thumbs.db"
    "*.tmp"
    "*.temp"
    ".env.local"
    ".env.production"
    ".cache"
    ".parcel-cache"
    "*.min.js"
    "*.min.css"
)

# Function to check if file should be excluded
should_exclude() {
    local file="$1"
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        if [[ "$file" == *"$pattern"* ]]; then
            return 0
        fi
    done
    return 1
}

# Clear output file
> "$OUTPUT_FILE"

echo "Exporting codebase to $OUTPUT_FILE..."
echo "=================================" >> "$OUTPUT_FILE"
echo "CODEBASE EXPORT - $(date)" >> "$OUTPUT_FILE"
echo "=================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Export directory structure first
echo "DIRECTORY STRUCTURE:" >> "$OUTPUT_FILE"
echo "===================" >> "$OUTPUT_FILE"
find . -maxdepth 10 -type d -not -path '*/\.*' -not -path '*/node_modules*' -not -path '*/dist*' -not -path '*/build*' -not -path '*/coverage*' | sort >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Export all files with their content
echo "FILE CONTENTS:" >> "$OUTPUT_FILE"
echo "==============" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find . -maxdepth 10 -type f -not -path '*/\.*' -not -path '*/node_modules*' -not -path '*/dist*' -not -path '*/build*' -not -path '*/coverage*' -not -name '*.md' -not -name '*.txt' -not -name 'package-lock.json' -not -name 'yarn.lock' -not -name '*.lock' -not -name '*.map' -not -name '*.min.js' -not -name '*.min.css' -not -name '*.bundle.*' -not -name '*.log' -not -name '*.env*' -not -name '*.test.*' -not -name '*.spec.*' -not -name '*.config.*' -not -name 'export_codebase.sh' -not -name 'codebase_export.txt' -print0 | while IFS= read -r -d '' file; do
    # Skip excluded files
    if should_exclude "$file"; then
        continue
    fi
    
    # Skip binary files and large files
    if file "$file" | grep -q "binary"; then
        continue
    fi
    
    # Skip files larger than 1MB
    if [[ $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null) -gt 1048576 ]]; then
        echo "----------------------------------------" >> "$OUTPUT_FILE"
        echo "FILE: $file (SKIPPED - too large)" >> "$OUTPUT_FILE"
        echo "----------------------------------------" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        continue
    fi
    
    echo "" >> "$OUTPUT_FILE"
    echo "=== $file ===" >> "$OUTPUT_FILE"
    echo '```'"$(basename "$file" | sed 's/.*\.//')"'' >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "Export complete! Output saved to $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"