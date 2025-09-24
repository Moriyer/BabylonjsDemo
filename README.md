# babylon-test

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### 场景切换脚本 / Scene Switching Script

#### 中文说明

`setScene` 脚本允许你快速切换Babylon.js场景文件并自动更新引用。

**功能特性：**
- 🔄 自动更新 `createEngine.ts` 中的场景引用
- 📁 支持 Demo/Scene 文件夹下的任意场景文件
- 👀 实时监听场景文件变化并提供保存提示
- 🛡️ 路径验证确保文件位置正确

**使用方法：**
```bash
# 使用相对路径
npm run setScene src/Demo/Scene/defaultScene.ts

# 使用绝对路径
npm run setScene E:\\Code\\Babylon\\babylon-test\\src\\Demo\\Scene\\NoiseScene.ts
```

**示例输出：**
```
✅ 成功更新引用到: src/Demo/Scene/NoiseScene.ts
📝 导入路径: ../Scene/NoiseScene
🔍 开始监听文件变化: src/Demo/Scene/NoiseScene.ts
按 Ctrl+C 停止监听
```

#### English Description

The `setScene` script allows you to quickly switch Babylon.js scene files and automatically update references.

**Features:**
- 🔄 Automatically updates scene references in `createEngine.ts`
- 📁 Supports any scene files under Demo/Scene folder
- 👀 Real-time file change monitoring with save notifications
- 🛡️ Path validation ensures correct file location

**Usage:**
```bash
# Using relative path
npm run setScene src/Demo/Scene/DefaultScene.ts

# Using absolute path
npm run setScene E:\\Code\\Babylon\\babylon-test\\src\\Demo\\Scene\\NoiseScene.ts
```

**Example Output:**
```
✅ Successfully updated reference to: src/Demo/Scene/NoiseScene.ts
📝 Import path: ../Scene/NoiseScene
🔍 Started monitoring file changes: src/Demo/Scene/NoiseScene.ts
Press Ctrl+C to stop monitoring
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
