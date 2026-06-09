$root = Join-Path $PSScriptRoot ''
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:5500/')
$listener.Start()
Write-Host "Serving $root at http://localhost:5500/"
while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $res = $context.Response
  $path = $req.Url.LocalPath
  if ($path -eq '/') { $path = '/index.html' }
  $filePath = Join-Path $root ($path.TrimStart('/'))
  if (Test-Path $filePath -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    $contentType = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.css'  { 'text/css' }
      '.js'   { 'application/javascript' }
      default { 'application/octet-stream' }
    }
    $res.ContentType = $contentType
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }
  $res.OutputStream.Close()
}
