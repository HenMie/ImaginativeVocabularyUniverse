-- 添加生词本功能
-- 使用方法:
-- 1. 在 Supabase Dashboard 中打开 SQL Editor
-- 2. 复制此文件内容并执行

-- 创建生词本表
CREATE TABLE IF NOT EXISTS public.vocabulary_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 词汇信息
  word TEXT NOT NULL,                    -- 原文(游戏语言)
  translation TEXT NOT NULL,             -- 中文释义
  language TEXT NOT NULL,                -- 词汇语言代码 (ko, ja, en等)
  
  -- 来源信息
  level_id TEXT REFERENCES public.levels(id) ON DELETE SET NULL,
  group_category TEXT,                   -- 所属分组类别
  tile_id TEXT,                          -- 原始词牌ID
  
  -- 元数据
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,          -- 最后复习时间
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),  -- 复习次数
  notes TEXT,                            -- 用户笔记
  
  -- 防止重复添加同一个词
  UNIQUE (user_id, word, language)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_vocabulary_book_user_language 
  ON public.vocabulary_book(user_id, language, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocabulary_book_user_added 
  ON public.vocabulary_book(user_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocabulary_book_level 
  ON public.vocabulary_book(level_id);

-- 启用 RLS
ALTER TABLE public.vocabulary_book ENABLE ROW LEVEL SECURITY;

-- RLS 策略: 用户只能管理自己的生词本
CREATE POLICY "Users manage own vocabulary" ON public.vocabulary_book
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 添加更新时间触发器
CREATE TRIGGER trg_vocabulary_book_updated_at
  BEFORE UPDATE ON public.vocabulary_book
  FOR EACH ROW EXECUTE PROCEDURE public.updated_at_column();

-- 添加 updated_at 字段（如果需要）
ALTER TABLE public.vocabulary_book 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 创建复习计数增量函数
CREATE OR REPLACE FUNCTION increment_review_count(vocab_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.vocabulary_book
  SET 
    review_count = review_count + 1,
    last_reviewed_at = NOW()
  WHERE id = vocab_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加一些示例数据（可选，用于测试）
-- INSERT INTO public.vocabulary_book (user_id, word, translation, language, group_category)
-- VALUES 
--   ('your-user-id-here', '우유', '牛奶', 'ko', '饮料'),
--   ('your-user-id-here', '사과', '苹果', 'ko', '水果');

