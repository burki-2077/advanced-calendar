#!/bin/bash

# Validation Script for Advanced Calendar Improvements
# This script verifies that all improvements have been properly implemented

echo "=================================================="
echo "🔍 Advanced Calendar - Implementation Validation"
echo "=================================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Success/failure counters
SUCCESS=0
FAILED=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌ $1 - NOT FOUND${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✅ $1/${NC}"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌ $1/ - NOT FOUND${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check file content
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅ $1 contains '$2'${NC}"
        ((SUCCESS++))
        return 0
    else
        echo -e "${RED}❌ $1 does not contain '$2'${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "📁 Checking Directory Structure..."
echo "-----------------------------------"
check_dir "src/utils"
echo ""

echo "📄 Checking Utility Modules..."
echo "-----------------------------------"
check_file "src/utils/logger.js"
check_file "src/utils/constants.js"
check_file "src/utils/dateUtils.js"
check_file "src/utils/apiUtils.js"
echo ""

echo "📚 Checking Documentation..."
echo "-----------------------------------"
check_file "QUICK_REFERENCE.md"
check_file "ARCHITECTURE.md"
check_file "IMPLEMENTATION.md"
check_file "README_IMPROVEMENTS.md"
echo ""

echo "🔧 Checking Frontend Updates..."
echo "-----------------------------------"
check_content "static/src/App.js" "response.success"
check_content "static/src/App.js" "response?.error"
check_content "static/src/App.js" "errorCode"
echo ""

echo "🧪 Checking Backend Integration..."
echo "-----------------------------------"
check_content "src/index.js" "import.*logger"
check_content "src/index.js" "import.*constants"
check_content "src/index.js" "import.*dateUtils"
check_content "src/index.js" "import.*apiUtils"
echo ""

echo "📦 Checking Package Dependencies..."
echo "-----------------------------------"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ Root package.json exists${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}❌ Root package.json missing${NC}"
    ((FAILED++))
fi

if [ -f "static/package.json" ]; then
    echo -e "${GREEN}✅ Frontend package.json exists${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}❌ Frontend package.json missing${NC}"
    ((FAILED++))
fi
echo ""

echo "🔐 Checking CSP Compliance..."
echo "-----------------------------------"
# Check for inline styles in component files
INLINE_STYLES=$(find static/src/components -name "*.js" -type f -exec grep -l "style={{" {} \; 2>/dev/null | wc -l)

if [ "$INLINE_STYLES" -eq 0 ]; then
    echo -e "${GREEN}✅ No inline styles found in components${NC}"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️  Found $INLINE_STYLES files with inline styles${NC}"
    echo "   Run: grep -r 'style={{' static/src/components/"
    echo "   Consider moving styles to CSS files"
fi
echo ""

echo "=================================================="
echo "📊 Validation Summary"
echo "=================================================="
echo -e "${GREEN}Passed: $SUCCESS${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Deploy to dev: ./deploy-to-dev.sh"
    echo "   2. Test in browser"
    echo "   3. Check console for errors"
    echo "   4. Review IMPLEMENTATION.md for additional enhancements"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some validations failed!${NC}"
    echo ""
    echo "📝 Action Required:"
    echo "   1. Review the failed checks above"
    echo "   2. Check IMPLEMENTATION.md for guidance"
    echo "   3. Re-run this script after fixes"
    echo ""
    exit 1
fi
