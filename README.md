# AI书伴 — 部署指南

## 第一步：注册GitHub账号（如果还没有）

1. 用Safari或电脑浏览器打开 [github.com](https://github.com)
2. 点击右上角 **Sign up** 注册
3. 输入邮箱、密码、用户名，完成验证
4. 登录后进入你的GitHub首页

## 第二步：创建仓库

1. 点击右上角 **+** → **New repository**
2. **Repository name** 填：`aibook`（或任意名字）
3. 选择 **Public**（公开）
4. **不要勾选** "Add a README file"
5. 点击 **Create repository**

## 第三步：上传代码

创建仓库后会看到上传指引。选择 **uploading an existing file** 链接：

1. 将 `src/` 目录下的所有文件 **拖拽** 到页面上：
   - index.html, style.css, app.js, books.js, config.js
   - manifest.json, sw.js
   - icon-192.png, icon-512.png

2. 拖拽完成后点击 **Commit changes**

## 第四步：填写DeepSeek API Key

1. 在仓库文件列表中找到 `config.js`，点击打开
2. 点击右上角 ✏️（编辑按钮）
3. 找到这一行：
   ```
   const DEEPSEEK_API_KEY = 'sk-你的DeepSeek-API-Key填在这里';
   ```
4. 把 `sk-你的DeepSeek-API-Key填在这里` 替换成你的真实API Key
5. 点击 **Commit changes** 保存

> ⚠️ 注意：确保仓库是 **Public** 的，否则API Key可能被他人看到。或者也可以部署后再在浏览器中修改。

## 第五步：启用GitHub Pages

1. 在仓库页面点击 **Settings**
2. 左侧菜单找到 **Pages**
3. **Branch** 选择 `main`，点击 **Save**
4. 等待1-2分钟，页面会显示：
   > Your site is live at `https://你的用户名.github.io/aibook/`

## 第六步：在iPhone上使用

1. 用 **Safari** 打开上面的网址
2. 点击底部分享按钮（⬆ 图标）
3. 滑动找到 **添加到主屏幕**
4. 名称确认为 "AI书伴"，点击 **添加**
5. 主屏幕出现 📚 AI书伴 图标
6. 点击图标——像普通App一样全屏使用！

---

## 本地测试

如果还没部署，可以先用电脑浏览器打开 `index.html` 预览效果。

---

## 常见问题

**Q: 搜索不到书？**
A: 当前内置5本书（道德经、论语、孙子兵法、菜根谭、飞鸟集）。更多书正在添加中。

**Q: AI不回复？**
A: 检查 config.js 中的 API Key 是否正确填写。

**Q: 聊天记录丢失？**
A: 数据保存在浏览器本地。清除Safari数据会导致丢失。
