@echo off
chcp 65001 >nul
echo ================================================
echo   中国农业绿色转型监测大屏 —— 项目初始化
echo ================================================
echo.

echo [1/4] 初始化 MySQL 数据库...
mysql -u root -p123456 < backend\schema.sql
if %ERRORLEVEL% neq 0 (
    echo ⚠ MySQL导入失败，请确认MySQL服务已启动，用户名root，密码123456
    echo   手动执行：mysql -u root -p123456 ^< backend\schema.sql
) else (
    echo ✓ 数据库 agriculture_green 创建成功
)
echo.

echo [2/4] 安装后端依赖并导入数据...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ⚠ npm install 失败，请确认已安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)
echo ✓ 后端依赖安装完成
echo 正在导入CSV数据到MySQL（约139个文件）...
node import_data.js
if %ERRORLEVEL% neq 0 (
    echo ⚠ 数据导入失败，请检查MySQL连接
) else (
    echo ✓ 数据导入完成
)
cd ..

echo.
echo [3/4] 安装前端依赖...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ⚠ 前端依赖安装失败
    pause
    exit /b 1
)
echo ✓ 前端依赖安装完成
cd ..

echo.
echo [4/4] 启动服务...
echo.
echo 请分别打开两个终端窗口：
echo   终端1: cd dashboard\backend ^&^& node server.js
echo   终端2: cd dashboard\frontend ^&^& npx vite
echo.
echo 然后访问 http://localhost:5173 查看大屏
echo ================================================
echo.

choice /c YN /m "是否现在启动后端服务？"
if %ERRORLEVEL% equ 2 exit /b 0
cd backend && node server.js
