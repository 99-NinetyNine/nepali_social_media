#!/bin/bash

echo "🔍 Validating TypeScript files..."

# Check all .tsx files for proper module structure
find src -name "*.tsx" | while read file; do
    echo -n "Checking $file: "
    
    # Check if file has imports or exports
    if grep -q "import\|export" "$file"; then
        echo "✅ Valid module"
    else
        echo "❌ Missing imports/exports"
        echo "   Adding empty export to fix..."
        echo "" >> "$file"
        echo "export {};" >> "$file"
    fi
done

echo ""
echo "🔍 File size check:"
find src -name "*.tsx" -size 0 -exec echo "❌ Empty file: {}" \;

echo ""
echo "✅ Validation complete!"