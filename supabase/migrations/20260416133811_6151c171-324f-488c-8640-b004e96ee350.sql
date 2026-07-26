-- Allow admins to read all stores
CREATE POLICY "Admins can view all stores"
ON public.stores
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
