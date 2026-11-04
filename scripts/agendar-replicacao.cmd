@echo off
REM ============================================================================
REM Replica o Neon (DATABASE_URL) para o warehouse local (DATABASE_URL_LOCAL).
REM Usado pelo Agendador de Tarefas do Windows (ver docs/MULTI-DATABASE-SETUP.md).
REM
REM - Roda a replica idempotente (nunca apaga dado do local).
REM - Log em logs\replicar-neon-local.log (rotacionado em 2 MB).
REM ============================================================================
setlocal EnableDelayedExpansion

REM Log em UTF-8 (o node ja escreve UTF-8; sem isso o cmd grava em OEM e mistura)
chcp 65001 >nul

set "RAIZ=%~dp0.."
cd /d "%RAIZ%"

if not exist "logs" mkdir "logs"

set "LOG=%RAIZ%\logs\replicar-neon-local.log"

REM Rotacao: mantem o log anterior quando o atual passa de 2 MB
if exist "%LOG%" (
  for %%A in ("%LOG%") do set "TAM=%%~zA"
  if !TAM! GTR 2000000 move /Y "%LOG%" "%LOG%.1" >nul
)

echo ================================================================ >> "%LOG%"
echo [%DATE% %TIME%] inicio da replica Neon -^> warehouse local >> "%LOG%"

node scripts\replicar-neon-local.js >> "%LOG%" 2>&1
set "ERRO=%ERRORLEVEL%"

if "%ERRO%"=="0" (
  echo [%DATE% %TIME%] replica concluida com sucesso >> "%LOG%"
) else (
  echo [%DATE% %TIME%] replica FALHOU ^(codigo %ERRO%^) >> "%LOG%"
)

exit /b %ERRO%
