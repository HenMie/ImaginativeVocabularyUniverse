-- 添加管理员用户脚本
-- 使用方法:
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制此文件内容
-- 3. 替换下面的 'your-user-uuid-here' 为实际的用户 UUID
-- 4. 执行 SQL

-- 步骤 1: 查看所有用户及其 UUID
-- 执行此查询找到你要添加为管理员的用户
SELECT 
  id AS user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- 步骤 2: 添加管理员
-- 替换 'your-user-uuid-here' 为上面查询结果中的用户 ID
-- 例如: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
INSERT INTO public.admin_users (user_id, notes)
VALUES ('your-user-uuid-here', '主管理员')
ON CONFLICT (user_id) DO NOTHING;

-- 步骤 3: 验证管理员已添加
SELECT 
  au.user_id,
  u.email,
  au.notes,
  au.created_at
FROM public.admin_users au
LEFT JOIN auth.users u ON u.id = au.user_id
ORDER BY au.created_at DESC;

-- 可选: 添加多个管理员
-- 取消下面的注释并替换 UUID
-- INSERT INTO public.admin_users (user_id, notes)
-- VALUES 
--   ('first-user-uuid', '主管理员'),
--   ('second-user-uuid', '副管理员'),
--   ('third-user-uuid', '内容管理员')
-- ON CONFLICT (user_id) DO NOTHING;

-- 可选: 移除管理员
-- 取消下面的注释并替换 UUID
-- DELETE FROM public.admin_users 
-- WHERE user_id = 'user-uuid-to-remove';

