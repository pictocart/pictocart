
CREATE POLICY "Referred user can record own attribution"
  ON public.partner_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (referred_user_id = auth.uid());
