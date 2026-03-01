@echo off
REM Lynx shim for Windows ManBot environment
conda run -n manbot npx tsx "d:\ProjectsPrivate\AI_ML\ManBot\src\utils\lynx-shim.ts" %*
