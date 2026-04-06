@echo off
setlocal enabledelayedexpansion

:: Configuration
set BASE_URL=http://localhost:5200/api
set TITLE_COLOR=echo.

echo ====================================================
echo    ASP.NET Core Stateful Singleton Leak Demo
echo ====================================================

:: 1. Alice Logs in
echo [1] Alice is logging in...
curl -s -X POST "%BASE_URL%/login?userId=Alice" > nul
echo     System: User Alice successfully set in session.

:: 2. Verify Alice sees her own data
echo [2] Alice checks her private data:
for /f "delims=" %%i in ('curl -s -X GET "%BASE_URL%/my-data"') do set ALICE_FIRST=%%i
echo     Response: %ALICE_FIRST%

echo.
:: 3. Bob Logs in (The "Attacker")
echo [3] Bob logs in from a different location...
curl -s -X POST "%BASE_URL%/login?userId=Bob" > nul
echo     System: User Bob successfully set in session.

:: 4. The Critical Moment: Alice checks her data again
echo [4] Alice refreshes her page (checking data again):
for /f "delims=" %%i in ('curl -s -X GET "%BASE_URL%/my-data"') do set ALICE_SECOND=%%i
echo     Response: %ALICE_SECOND%

echo.
echo ====================================================
echo                   TEST RESULT
echo ====================================================

:: Check if the string "Bob" exists in Alice's second request result
echo %ALICE_SECOND% | findstr /C:"Bob" > nul
if %errorlevel%==0 (
    echo FAILED: DATA LEAK DETECTED!
    echo Alice is now seeing Bob's identity.
    echo Reason: The Singleton service shared memory across requests.
) else (
    echo SUCCESS: No leak detected.
    echo Alice's session was either cleared (Scoped) or remained Alice.
)

echo ====================================================
pause