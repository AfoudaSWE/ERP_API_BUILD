[CmdletBinding()]
param(
    [ValidateRange(0, 20)]
    [int]$CameraIndex = 0
)

$ErrorActionPreference = "Stop"
$agentRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = (Resolve-Path (Join-Path $agentRoot "..\..\..")).Path

$env:CAMERA_INDEX = $CameraIndex.ToString()
Set-Location $workspaceRoot

Write-Host "Starting USB camera at OpenCV index $CameraIndex."
Write-Host "Press Q in the camera window to stop; press R to reset counters."
& .\node_modules\.bin\nx.cmd serve vision-camera-agent

if ($LASTEXITCODE -ne 0) {
    throw "The camera agent stopped with exit code $LASTEXITCODE. If the camera did not open, retry with -CameraIndex 0 or -CameraIndex 2."
}
