-- Supabase 初始化脚本（纯在线模式）
-- 关卡数据存储在数据库中，管理员可在云端直接编辑。

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户公开资料
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  preferred_language TEXT NOT NULL DEFAULT 'zh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户全局进度（离线直接提示网络错误，无需额外缓存）
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 120 CHECK (coins >= 0),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_online_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 在线关卡定义（含 JSON 内容，可由管理员直接编辑）
CREATE TABLE IF NOT EXISTS public.levels (
  id TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  language TEXT[] NOT NULL DEFAULT ARRAY['zh'],
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  content JSONB NOT NULL CHECK (
    jsonb_typeof(content) = 'object'
    AND content ? 'groups'
  ),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户在关卡中的最新状态
CREATE TABLE IF NOT EXISTS public.user_level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  best_time_ms INTEGER CHECK (best_time_ms > 0),
  best_score INTEGER CHECK (best_score >= 0),
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, level_id)
);

-- 排行榜（公开展示最佳成绩）
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  completion_time_ms INTEGER NOT NULL CHECK (completion_time_ms > 0),
  coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
  hints_spent INTEGER NOT NULL DEFAULT 0 CHECK (hints_spent >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, level_id)
);

-- 管理员清单
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- 基础关卡示例（供前端在线读取）
INSERT INTO public.levels (id, difficulty, language, version, is_published, content)
VALUES (
  'level-001',
  'easy',
  ARRAY['ko', 'zh', 'en', 'ja'],
  2,
  TRUE,
  $$
  {
    "tutorialSteps": [
      {
        "ko": "카드를 일렬로 드래그해 그룹을 완성해요.",
        "zh": "拖动四个词牌排成一行即可分组。",
        "en": "Drag four tiles into a row to form a group.",
        "ja": "タイルを4枚一列にドラッグするとグループになります。"
      },
      {
        "ko": "타일을 탭하면 뜻을 확인할 수 있어요.",
        "zh": "点击词牌可查看释义。",
        "en": "Tap a tile to view its definition.",
        "ja": "タイルをタップすると意味を確認できます。"
      }
    ],
    "groups": [
      {
        "id": "drinks",
        "category": {
          "ko": "음료",
          "zh": "饮料",
          "en": "drinks",
          "ja": "飲み物"
        },
        "colorPreset": "lilac",
        "tiles": [
          { "id": "milk", "text": { "ko": "우유", "zh": "牛奶", "en": "milk", "ja": "牛乳" } },
          { "id": "juice", "text": { "ko": "주스", "zh": "果汁", "en": "juice", "ja": "ジュース" } },
          { "id": "tea", "text": { "ko": "차", "zh": "茶", "en": "tea", "ja": "お茶" } },
          { "id": "soda", "text": { "ko": "탄산음료", "zh": "汽水", "en": "soda", "ja": "ソーダ" } }
        ]
      },
      {
        "id": "fruits",
        "category": {
          "ko": "과일",
          "zh": "水果",
          "en": "fruits",
          "ja": "果物"
        },
        "colorPreset": "mint",
        "tiles": [
          { "id": "orange", "text": { "ko": "오렌지", "zh": "橙子", "en": "orange", "ja": "オレンジ" } },
          { "id": "watermelon", "text": { "ko": "수박", "zh": "西瓜", "en": "watermelon", "ja": "スイカ" } },
          { "id": "apple", "text": { "ko": "사과", "zh": "苹果", "en": "apple", "ja": "りんご" } },
          { "id": "banana", "text": { "ko": "바나나", "zh": "香蕉", "en": "banana", "ja": "バナナ" } }
        ]
      },
      {
        "id": "colors",
        "category": {
          "ko": "색깔",
          "zh": "颜色",
          "en": "colors",
          "ja": "色"
        },
        "colorPreset": "sunset",
        "tiles": [
          { "id": "red", "text": { "ko": "빨강", "zh": "红色", "en": "red", "ja": "赤" } },
          { "id": "blue", "text": { "ko": "파랑", "zh": "蓝色", "en": "blue", "ja": "青" } },
          { "id": "yellow", "text": { "ko": "노랑", "zh": "黄色", "en": "yellow", "ja": "黄" } },
          { "id": "green", "text": { "ko": "초록", "zh": "绿色", "en": "green", "ja": "緑" } }
        ]
      },
      {
        "id": "tableware",
        "category": {
          "ko": "식기",
          "zh": "餐具",
          "en": "tableware",
          "ja": "食器"
        },
        "colorPreset": "rose",
        "tiles": [
          { "id": "fork", "text": { "ko": "포크", "zh": "叉子", "en": "fork", "ja": "フォーク" } },
          { "id": "spoon", "text": { "ko": "숟가락", "zh": "勺子", "en": "spoon", "ja": "スプーン" } },
          { "id": "plate", "text": { "ko": "접시", "zh": "盘子", "en": "plate", "ja": "皿" } },
          { "id": "chopsticks", "text": { "ko": "젓가락", "zh": "筷子", "en": "chopsticks", "ja": "箸" } }
        ]
      }
    ]
  }
  $$::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_progress_last_online ON public.user_progress(last_online_at DESC);
CREATE INDEX IF NOT EXISTS idx_levels_published ON public.levels(is_published);
CREATE INDEX IF NOT EXISTS idx_user_level_progress_user ON public.user_level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_level_time ON public.leaderboards(level_id, completion_time_ms);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 公开访问策略
CREATE POLICY "Profiles are publicly viewable" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Published levels are viewable" ON public.levels
  FOR SELECT USING (
    is_published
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Leaderboards are publicly viewable" ON public.leaderboards
  FOR SELECT USING (true);

-- 用户自管策略
CREATE POLICY "Users manage own profile" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own progress" ON public.user_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own level progress" ON public.user_level_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own leaderboard entries" ON public.leaderboards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 管理策略
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

DROP POLICY IF EXISTS "Admins manage admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Admins read admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Service role manages admin list" ON public.admin_users;

CREATE POLICY "Admins read admin list" ON public.admin_users
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Service role manages admin list" ON public.admin_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 新用户自动初始化
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  ) || '-' || substring(NEW.id::TEXT, 1, 6);

  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    generated_username
  );

  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_level_progress (user_id, level_id, status)
  VALUES (NEW.id, 'level-001', 'in_progress')
  ON CONFLICT (user_id, level_id) DO NOTHING;

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

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER trg_levels_updated_at
  BEFORE UPDATE ON public.levels
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER trg_user_level_progress_updated_at
  BEFORE UPDATE ON public.user_level_progress
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

-- 初始化管理员（执行前替换 UUID）
-- INSERT INTO public.admin_users (user_id)
-- VALUES ('your-user-uuid-here');
