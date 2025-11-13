-- Supabase 初始化脚本（全新环境）

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户公开资料
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  language_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户进度（除去关卡解锁等列表字段）
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 120 CHECK (coins >= 0),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 关卡元数据（可在迁移或种子脚本中预填）
CREATE TABLE IF NOT EXISTS public.levels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  group_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户已解锁关卡
CREATE TABLE IF NOT EXISTS public.user_unlocked_levels (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_source TEXT,
  PRIMARY KEY (user_id, level_id)
);

-- 关卡快照（每位用户每关 1 条）
CREATE TABLE IF NOT EXISTS public.level_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  best_time_ms INTEGER CHECK (best_time_ms > 0),
  last_played_at TIMESTAMPTZ,
  coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, level_id)
);

-- 快照内的分组完成状态
CREATE TABLE IF NOT EXISTS public.level_snapshot_groups (
  snapshot_id UUID NOT NULL REFERENCES public.level_snapshots(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'completed')),
  PRIMARY KEY (snapshot_id, group_id)
);

-- 快照内的单元格/卡片状态
CREATE TABLE IF NOT EXISTS public.level_snapshot_tiles (
  snapshot_id UUID NOT NULL REFERENCES public.level_snapshots(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'remaining' CHECK (state IN ('remaining', 'cleared')),
  PRIMARY KEY (snapshot_id, tile_id)
);

-- 快照内的提示使用记录
CREATE TABLE IF NOT EXISTS public.level_snapshot_hints (
  snapshot_id UUID NOT NULL REFERENCES public.level_snapshots(id) ON DELETE CASCADE,
  hint_type TEXT NOT NULL,
  times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  total_cost INTEGER NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  PRIMARY KEY (snapshot_id, hint_type)
);

-- 排行榜（每位用户每关唯一成绩）
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  completion_time_ms INTEGER NOT NULL CHECK (completion_time_ms > 0),
  coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  hints_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (level_id, user_id)
);

-- 管理角色 & 权限
CREATE TABLE IF NOT EXISTS public.admin_roles (
  name TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  code TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_name TEXT NOT NULL REFERENCES public.admin_roles(name) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.admin_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_name, permission_code)
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL REFERENCES public.admin_roles(name),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_user_permissions (
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.admin_permissions(code) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_user_id, permission_code)
);

-- 基础数据
INSERT INTO public.levels (id, title, difficulty, group_name)
VALUES ('level-001', '入门关卡', 'easy', 'starter')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_roles (name, description)
VALUES ('admin', '默认管理员'), ('super_admin', '具有最高权限')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.admin_permissions (code, description)
VALUES
  ('levels.manage', '管理关卡内容'),
  ('leaderboards.moderate', '维护排行榜'),
  ('users.manage', '管理用户资料')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_name, permission_code)
VALUES
  ('admin', 'leaderboards.moderate'),
  ('admin', 'levels.manage'),
  ('super_admin', 'leaderboards.moderate'),
  ('super_admin', 'levels.manage'),
  ('super_admin', 'users.manage')
ON CONFLICT (role_name, permission_code) DO NOTHING;

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_progress_updated_at ON public.user_progress(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_levels_level_id ON public.user_unlocked_levels(level_id);
CREATE INDEX IF NOT EXISTS idx_level_snapshots_user_id ON public.level_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_level_id_time ON public.leaderboards(level_id, completion_time_ms);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unlocked_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_snapshot_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_snapshot_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_snapshot_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_permissions ENABLE ROW LEVEL SECURITY;

-- 公开读取
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Levels are publicly readable" ON public.levels FOR SELECT USING (true);
CREATE POLICY "Leaderboards are publicly viewable" ON public.leaderboards FOR SELECT USING (true);

-- 用户自管理策略
CREATE POLICY "Users manage own profile" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own progress" ON public.user_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own unlocked levels" ON public.user_unlocked_levels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own level snapshots" ON public.level_snapshots
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own snapshot groups" ON public.level_snapshot_groups
  USING (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own snapshot tiles" ON public.level_snapshot_tiles
  USING (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own snapshot hints" ON public.level_snapshot_hints
  USING (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.level_snapshots ls
      WHERE ls.id = snapshot_id AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own leaderboard entries" ON public.leaderboards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 管理员策略（默认要求存在 admin_users 记录）
CREATE POLICY "Admins manage levels" ON public.levels
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

CREATE POLICY "Admins manage admin tables" ON public.admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  );

CREATE POLICY "Admins manage permission catalog" ON public.admin_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  );

CREATE POLICY "Admins map role permissions" ON public.admin_role_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  );

CREATE POLICY "Admins manage admin users" ON public.admin_users
  FOR ALL
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  );

CREATE POLICY "Admins grant explicit permissions" ON public.admin_user_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.role_name = 'super_admin'
    )
  );

-- 函数：新用户自动建档
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ) || '-' || substring(NEW.id::TEXT, 1, 8);

  INSERT INTO public.profiles (id, username, full_name, language_preferences)
  VALUES (
    NEW.id,
    generated_username,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->'language_preferences', '{}'::jsonb)
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_unlocked_levels (user_id, level_id)
  VALUES (NEW.id, 'level-001')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION public.updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER set_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER set_level_snapshots_updated_at
  BEFORE UPDATE ON public.level_snapshots
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER set_leaderboards_updated_at
  BEFORE UPDATE ON public.leaderboards
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER set_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

-- 初始化 super_admin（请替换为真实 UUID 后执行一次）
-- INSERT INTO public.admin_users (user_id, role_name)
-- VALUES ('your-user-uuid-here', 'super_admin');
