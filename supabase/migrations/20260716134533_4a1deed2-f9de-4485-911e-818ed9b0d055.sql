
-- Ensure execute permissions on helper function
GRANT EXECUTE ON FUNCTION public.current_business_id() TO authenticated, anon, service_role;

-- Ensure table grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notes TO authenticated;
GRANT ALL ON public.customer_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;

-- Recreate RLS policies scoped to authenticated role
DROP POLICY IF EXISTS "own business" ON public.businesses;
CREATE POLICY "own business" ON public.businesses FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "own customers" ON public.customers;
CREATE POLICY "own customers" ON public.customers FOR ALL TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS "own customer notes" ON public.customer_notes;
CREATE POLICY "own customer notes" ON public.customer_notes FOR ALL TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS "own quotations" ON public.quotations;
CREATE POLICY "own quotations" ON public.quotations FOR ALL TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS "own quotation items" ON public.quotation_items;
CREATE POLICY "own quotation items" ON public.quotation_items FOR ALL TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

DROP POLICY IF EXISTS "own activities" ON public.activities;
CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated
  USING (business_id = public.current_business_id())
  WITH CHECK (business_id = public.current_business_id());

-- Unique constraint on businesses.owner_id (for ON CONFLICT and single-workspace guarantee)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_owner_id_key'
  ) THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_owner_id_key UNIQUE (owner_id);
  END IF;
END $$;

-- Ensure signup trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill businesses for any existing users missing one
INSERT INTO public.businesses (owner_id, name, email)
SELECT u.id, 'My Business', u.email
FROM auth.users u
LEFT JOIN public.businesses b ON b.owner_id = u.id
WHERE b.id IS NULL
ON CONFLICT (owner_id) DO NOTHING;
