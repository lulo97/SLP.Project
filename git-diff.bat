@echo off

echo ===== CURRENT GIT STATUS =====
git status

echo.
echo ===== FILE CHANGES (WORKING TREE) =====
git diff

echo.
echo ===== STAGED CHANGES =====
git diff --cached

echo.
echo ===== UNTRACKED FILE CONTENT =====
for /f "delims=" %%f in ('git ls-files --others --exclude-standard') do (
    echo.
    echo ----- %%f -----
    type "%%f"
)

echo.
echo ===== CURRENT COMMIT =====
git log -1 --oneline
