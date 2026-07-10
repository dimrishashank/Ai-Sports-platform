$content = [System.IO.File]::ReadAllText("c:\Users\ACER\OneDrive\Desktop\ai powered sports platform\conference1.tex")
$matches = [regex]::Matches($content, '[^\x00-\x7F]')
foreach($match in $matches) {
    $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
    $charCode = [int]$match.Value[0]
    $charHex = "{0:X4}" -f $charCode
    $context = $content.Substring([Math]::Max(0, $match.Index - 20), [Math]::Min(40, $content.Length - [Math]::Max(0, $match.Index - 20)))
    Write-Host "Line $lineNum : U+$charHex  Context: ...$context..."
}
Write-Host "`nTotal non-ASCII characters found: $($matches.Count)"
