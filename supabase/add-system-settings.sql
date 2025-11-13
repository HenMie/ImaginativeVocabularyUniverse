-- 添加系统配置表
-- 使用方法:
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制此文件内容并执行

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 所有人可以读取系统配置
CREATE POLICY "System settings are publicly viewable" ON public.system_settings
  FOR SELECT USING (true);

-- 只有管理员可以修改系统配置
CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- 添加更新时间触发器
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

-- 插入默认配置
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'registration_enabled',
    'true'::jsonb,
    '是否开放新用户注册'
  ),
  (
    'email_verification_required',
    'true'::jsonb,
    '新用户注册是否需要邮箱验证'
  )
ON CONFLICT (key) DO NOTHING;

-- 验证配置已添加
SELECT key, value, description, created_at
FROM public.system_settings
ORDER BY key;

-- 注意事项：
-- 1. 如果关闭邮箱验证（email_verification_required = false），需要在 Supabase Dashboard 中配置：
--    Authentication > Settings > Email Auth > Confirm email = 关闭
-- 2. 或者使用 Supabase CLI 配置：
--    在 supabase/config.toml 中设置：
--    [auth.email]
--    enable_confirmations = false

