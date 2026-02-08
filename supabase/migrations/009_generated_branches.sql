CREATE TABLE generated_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  choice_label TEXT NOT NULL,
  choice_answer TEXT NOT NULL,
  yaml_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT DEFAULT 'Anonymous',
  moderation_reason TEXT,
  moderation_confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE generated_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved branches"
  ON generated_branches FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authors can read own branches"
  ON generated_branches FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can insert"
  ON generated_branches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can read all branches"
  ON generated_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update status"
  ON generated_branches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
