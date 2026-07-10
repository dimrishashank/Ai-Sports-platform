$file = "c:\Users\ACER\OneDrive\Desktop\ai powered sports platform\conference1.tex"
$content = [System.IO.File]::ReadAllText($file)

# Replace smart/curly single quotes with straight apostrophe
$content = $content.Replace([string][char]0x2019, "'")
$content = $content.Replace([string][char]0x2018, "'")

# Replace curly double quotes
$content = $content.Replace([string][char]0x201C, "``")
$content = $content.Replace([string][char]0x201D, "''")

# Replace unicode en-dash and em-dash with hyphen
$content = $content.Replace([string][char]0x2013, "-")
$content = $content.Replace([string][char]0x2014, "-")

# Remove inverted question mark and inverted exclamation
$content = $content.Replace([string][char]0x00BF, "")
$content = $content.Replace([string][char]0x00A1, "")

[System.IO.File]::WriteAllText($file, $content)
Write-Host "Done - all special characters fixed"
