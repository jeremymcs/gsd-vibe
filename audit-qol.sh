#!/bin/bash

set -euo pipefail

AUDIT_DIR="audit-reports"
mkdir -p "$AUDIT_DIR"

echo "=== GSD VCCA QOL Coverage Audit ===" 
echo "Auditing requirements R160-R166..."
echo ""

# Initialize reports
echo "# QOL Coverage Audit Report" > "$AUDIT_DIR/qol-coverage.md"
echo "Generated: $(date)" >> "$AUDIT_DIR/qol-coverage.md"
echo "" >> "$AUDIT_DIR/qol-coverage.md"

echo "# Requirement Evidence Report" > "$AUDIT_DIR/requirement-evidence.md"
echo "Generated: $(date)" >> "$AUDIT_DIR/requirement-evidence.md"
echo "" >> "$AUDIT_DIR/requirement-evidence.md"

# Count all view files
TOTAL_VIEWS=$(find src -name "*.tsx" | grep -v test | grep -v ui | wc -l)
echo "Total view files found: $TOTAL_VIEWS"

# R160: Search/filter on list views
echo ""
echo "=== R160: Search/Filter Analysis ==="
echo "## R160: Search/Filter Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find components that likely render lists
echo "Scanning for list/table views..."
LIST_VIEWS=$(find src -name "*.tsx" | grep -v test | xargs grep -l -E "(\.map\(|Table|List|DataTable)" | wc -l)
echo "Potential list views: $LIST_VIEWS"

# Find search implementations
SEARCH_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(search|filter|SearchInput)" | wc -l)
echo "Views with search/filter: $SEARCH_IMPLS"

echo "- Total potential list views: $LIST_VIEWS" >> "$AUDIT_DIR/qol-coverage.md"
echo "- Views with search/filter: $SEARCH_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"

# Find specific files with lists but no search
echo "### Views with lists but no search:" >> "$AUDIT_DIR/qol-coverage.md"
find src -name "*.tsx" | grep -v test | while read file; do
    if grep -q -E "(\.map\(|Table|List)" "$file" && ! grep -q -E "(search|filter|SearchInput)" "$file"; then
        echo "- $file" >> "$AUDIT_DIR/qol-coverage.md"
    fi
done

# R161: Copy-to-clipboard functionality
echo ""
echo "=== R161: Copy-to-clipboard Analysis ==="
echo "## R161: Copy-to-clipboard Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find copy implementations
COPY_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(copy|clipboard|CopyButton)" | wc -l)
echo "Views with copy functionality: $COPY_IMPLS"

echo "- Views with copy functionality: $COPY_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"

# Find IDs and paths that should have copy buttons
echo "### Potential copy targets without copy buttons:" >> "$AUDIT_DIR/qol-coverage.md"
find src -name "*.tsx" | grep -v test | while read file; do
    if grep -q -E "(id|Id|ID|path|Path|filename)" "$file" && ! grep -q -E "(copy|clipboard)" "$file"; then
        echo "- $file (has IDs/paths but no copy)" >> "$AUDIT_DIR/qol-coverage.md"
    fi
done

# R162: Tooltip coverage
echo ""
echo "=== R162: Tooltip Analysis ==="
echo "## R162: Tooltip Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find tooltip usage
TOOLTIP_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(Tooltip|tooltip)" | wc -l)
echo "Views with tooltips: $TOOLTIP_IMPLS"

# Find icon-only buttons without tooltips
ICON_BUTTONS=$(find src -name "*.tsx" | xargs grep -l -E "(<Button[^>]*>[^<]*<[A-Z].*Icon|<.*Icon.*onClick)" | wc -l)
echo "Views with icon buttons: $ICON_BUTTONS"

echo "- Views with tooltips: $TOOLTIP_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"
echo "- Views with icon buttons: $ICON_BUTTONS" >> "$AUDIT_DIR/qol-coverage.md"

# R163: Refresh buttons
echo ""
echo "=== R163: Refresh Button Analysis ==="
echo "## R163: Refresh Button Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find refresh implementations
REFRESH_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(refresh|reload|RefreshIcon)" | wc -l)
echo "Views with refresh buttons: $REFRESH_IMPLS"

# Find data-fetching views without refresh
DATA_VIEWS=$(find src -name "*.tsx" | xargs grep -l -E "(useQuery|fetch|api\.|invoke)" | wc -l)
echo "Data-fetching views: $DATA_VIEWS"

echo "- Views with refresh buttons: $REFRESH_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"
echo "- Data-fetching views: $DATA_VIEWS" >> "$AUDIT_DIR/qol-coverage.md"

# R164: Confirmation dialogs
echo ""
echo "=== R164: Confirmation Dialog Analysis ==="
echo "## R164: Confirmation Dialog Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find confirmation implementations
CONFIRM_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(AlertDialog|confirm|Dialog.*delete|Dialog.*remove)" | wc -l)
echo "Views with confirmation dialogs: $CONFIRM_IMPLS"

# Find destructive actions without confirmation
DESTRUCTIVE_ACTIONS=$(find src -name "*.tsx" | xargs grep -l -E "(delete|remove|clear|reset|discard)" | wc -l)
echo "Views with potentially destructive actions: $DESTRUCTIVE_ACTIONS"

echo "- Views with confirmation dialogs: $CONFIRM_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"
echo "- Views with destructive actions: $DESTRUCTIVE_ACTIONS" >> "$AUDIT_DIR/qol-coverage.md"

# R165: Relative timestamps
echo ""
echo "=== R165: Relative Timestamp Analysis ==="
echo "## R165: Relative Timestamp Coverage" >> "$AUDIT_DIR/qol-coverage.md"

# Find timestamp implementations
TIMESTAMP_IMPLS=$(find src -name "*.tsx" | xargs grep -l -E "(formatRelativeTime|timeAgo|moment|date)" | wc -l)
echo "Views with timestamps: $TIMESTAMP_IMPLS"

# Find time-sensitive data without relative timestamps
TIME_SENSITIVE=$(find src -name "*.tsx" | xargs grep -l -E "(createdAt|updatedAt|timestamp|date|time)" | wc -l)
echo "Views with time-sensitive data: $TIME_SENSITIVE"

echo "- Views with relative timestamps: $TIMESTAMP_IMPLS" >> "$AUDIT_DIR/qol-coverage.md"
echo "- Views with time-sensitive data: $TIME_SENSITIVE" >> "$AUDIT_DIR/qol-coverage.md"

echo ""
echo "Audit complete! Reports generated in $AUDIT_DIR/"
echo "Summary stats written to both qol-coverage.md and requirement-evidence.md"

# Generate summary for requirement-evidence.md
cat >> "$AUDIT_DIR/requirement-evidence.md" << EVIDENCE_EOF

## Summary of QOL Coverage Gaps

### R160 (Search/Filter): $((LIST_VIEWS - SEARCH_IMPLS)) gap
- Potential list views: $LIST_VIEWS
- With search/filter: $SEARCH_IMPLS

### R161 (Copy-to-clipboard): Need detailed analysis
- Views with copy functionality: $COPY_IMPLS

### R162 (Tooltips): $((ICON_BUTTONS - TOOLTIP_IMPLS)) potential gap
- Views with icon buttons: $ICON_BUTTONS
- Views with tooltips: $TOOLTIP_IMPLS

### R163 (Refresh buttons): $((DATA_VIEWS - REFRESH_IMPLS)) gap
- Data-fetching views: $DATA_VIEWS  
- With refresh buttons: $REFRESH_IMPLS

### R164 (Confirmation dialogs): $((DESTRUCTIVE_ACTIONS - CONFIRM_IMPLS)) potential gap
- Views with destructive actions: $DESTRUCTIVE_ACTIONS
- With confirmation dialogs: $CONFIRM_IMPLS

### R165 (Relative timestamps): $((TIME_SENSITIVE - TIMESTAMP_IMPLS)) gap
- Views with time-sensitive data: $TIME_SENSITIVE
- With relative timestamps: $TIMESTAMP_IMPLS

EVIDENCE_EOF

exit 0
