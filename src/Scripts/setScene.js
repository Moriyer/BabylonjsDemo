const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('请提供场景文件路径参数');
    console.error('用法: npm run setScene <scene-file-path>');
    console.error('示例: npm run setScene src/Demo/Scene/DefaultScene.ts');
    console.error('注意: 在Windows中请使用正斜杠 / 或双引号包围路径');
    process.exit(1);
}

const inputPath = args[0];
console.log(`🔍 接收到的原始路径参数: "${inputPath}"`);
const projectRoot = path.resolve(__dirname, '../..');
const createEngineFile = path.join(projectRoot, 'src/Demo/Engine/createEngine.ts');

// 标准化路径并验证
function normalizePath(inputPath) {
    let normalizedPath = inputPath;
    
    // 首先标准化路径分隔符（Windows兼容性）
    normalizedPath = normalizedPath.replace(/\\/g, '/');
    
    // 如果是绝对路径，转换为相对路径
    if (path.isAbsolute(inputPath)) {
        normalizedPath = path.relative(projectRoot, inputPath);
        // 再次标准化路径分隔符
        normalizedPath = normalizedPath.replace(/\\/g, '/');
    }
    
    // 验证路径是否在Demo/Scene文件夹下
    if (!normalizedPath.includes('Demo/Scene')) {
        console.error(`❌ 路径验证失败: ${normalizedPath}`);
        console.error('📁 输入路径必须包含 Demo/Scene 文件夹');
        console.error('✅ 正确示例: src/Demo/Scene/DefaultScene.ts');
        throw new Error('文件路径必须在Demo/Scene文件夹或其子文件夹下');
    }
    
    return normalizedPath;
}

// 更新createEngine.ts文件中的引用
function updateImport(scenePath) {
    try {
        // 读取createEngine.ts文件
        const content = fs.readFileSync(createEngineFile, 'utf8');
        
        // 计算相对路径
        const engineDir = path.dirname(createEngineFile);
        const sceneFile = path.join(projectRoot, scenePath);
        let relativePath = path.relative(engineDir, sceneFile);
        
        // 确保使用正斜杠并移除.ts扩展名
        relativePath = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
        
        // 如果不以./或../开头，添加./
        if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
            relativePath = './' + relativePath;
        }
        
        // 提取文件名作为导入的类名（假设类名与文件名相同）
        const fileName = path.basename(sceneFile, '.ts');
        
        // 替换导入语句
        const importRegex = /\/\/Change Import Here Start[\s\S]*?\/\/Change Import Here End/;
        const newImport = `//Change Import Here Start\nimport { Playground } from '${relativePath}';\n//Change Import Here End`;
        
        const updatedContent = content.replace(importRegex, newImport);
        
        // 写回文件
        fs.writeFileSync(createEngineFile, updatedContent, 'utf8');
        
        console.log(`✅ 成功更新引用到: ${scenePath}`);
        console.log(`📝 导入路径: ${relativePath}`);
        
    } catch (error) {
        console.error('❌ 更新引用失败:', error.message);
        process.exit(1);
    }
}

// 主函数
function main() {
    try {
        const normalizedPath = normalizePath(inputPath);
        const fullPath = path.join(projectRoot, normalizedPath);
        
        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
            throw new Error(`文件不存在: ${fullPath}`);
        }
        
        // 更新引用
        updateImport(normalizedPath);
        
        // 启动文件监听
        console.log(`🔍 开始监听文件变化: ${normalizedPath}`);
        console.log('按 Ctrl+C 停止监听\n');
        
        const watcher = chokidar.watch(fullPath, {
            persistent: true,
            ignoreInitial: true
        });
        
        watcher.on('change', () => {
            const timestamp = new Date().toLocaleString();
            console.log(`📁 [${timestamp}] 检测到文件变化: ${normalizedPath}`);
        });
        
        watcher.on('error', (error) => {
            console.error('❌ 文件监听错误:', error);
        });
        
        // 优雅退出
        process.on('SIGINT', () => {
            console.log('\n🛑 停止文件监听');
            watcher.close();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        process.exit(1);
    }
}

// 运行主函数
main();