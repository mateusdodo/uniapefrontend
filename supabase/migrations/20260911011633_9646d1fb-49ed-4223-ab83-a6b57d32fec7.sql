CREATE POLICY "Membros do grupo veem o contrato"
ON public.contratos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.grupo_membros gm
    WHERE gm.grupo_id = contratos.grupo_id AND gm.usuario_id = auth.uid()
  )
);