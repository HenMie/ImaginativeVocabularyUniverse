# 部署配置说明

## SPA 路由问题修复

当用户直接访问 `/levels/level-001` 等路由时，服务器会尝试查找对应的文件，但实际上这些是客户端路由，需要服务器将所有请求回退到 `index.html`。

## 已创建的配置文件

### 1. `public/.htaccess` (Apache 服务器)
如果使用 Apache 服务器，此文件会自动生效。确保 Apache 已启用 `mod_rewrite` 模块。

### 2. `public/_redirects` (Netlify/Vercel)
如果使用 Netlify 或 Vercel 部署，此文件会自动生效。

### 3. `nginx.conf.example` (Nginx 服务器)
如果使用 Nginx 服务器，需要手动配置。将此配置添加到你的 Nginx 站点配置中：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 部署步骤

1. **重新构建项目**
   ```bash
   npm run build
   ```

2. **上传 dist 目录到服务器**
   - 确保 `.htaccess` 和 `_redirects` 文件被上传
   - 如果使用 Nginx，根据 `nginx.conf.example` 配置服务器

3. **验证配置**
   - 直接访问 `https://vocabulary.ningriri.cn/levels/level-001`
   - 应该能正常加载页面，而不是返回 404

## 常见问题

### Apache 服务器
- 确保 `.htaccess` 文件在网站根目录（dist 目录）
- 确保 Apache 已启用 `mod_rewrite` 模块
- 检查 Apache 配置中 `AllowOverride` 设置为 `All`

### Nginx 服务器
- 参考 `nginx.conf.example` 配置
- 确保 `try_files` 指令正确配置
- 重新加载 Nginx 配置：`nginx -s reload`

### Netlify/Vercel
- `_redirects` 文件会自动生效
- 无需额外配置

## 测试

部署后，测试以下 URL 是否都能正常访问：
- `https://vocabulary.ningriri.cn/`
- `https://vocabulary.ningriri.cn/levels/level-001`
- `https://vocabulary.ningriri.cn/levels/level-002`
- `https://vocabulary.ningriri.cn/admin` (如果已登录)

所有路由都应该正常加载，而不是返回 404 错误。

