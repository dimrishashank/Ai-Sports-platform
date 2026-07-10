# Check both files for quote issues
$files = @(
    "c:\Users\ACER\OneDrive\Desktop\ai powered sports platform\conference1.tex",
    "c:\Users\ACER\OneDrive\Desktop\ai powered sports platform\conference2.tex"
)

foreach ($file in $files) {
    $basename = [System.IO.Path]::GetFileName($file)
    Write-Host "`n========== $basename =========="
    $lines = [System.IO.File]::ReadAllLines($file)
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        $num = $i + 1
        
        # Skip bibliography lines (they use `` '' correctly)
        if ($line -match '\\bibitem') { continue }
        if ($line -match '^[A-Z]\.~' -or $line -match '^\w\.~\w') { continue }
        
        # Check for straight double quotes "..."
        if ($line -match '"') {
            Write-Host "L${num} [STRAIGHT-DBL-QUOTE]: $line"
        }
        
        # Check for 'text' where opening ' should be ` (but skip possessives like it's, authors', don't)
        # Look for space/start followed by ' then a letter (opening single quote pattern)
        if ($line -match "(\s|^)'[A-Za-z]" -and $line -notmatch "\\\\cite" -and $line -notmatch "\\\\ref") {
            Write-Host "L${num} [SINGLE-QUOTE-OPEN]: $line"
        }
    }
}
