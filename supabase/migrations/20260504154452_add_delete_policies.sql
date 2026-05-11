/*
  # Add DELETE policies for campaigns and simulation_results

  Both tables were missing DELETE RLS policies, causing delete operations
  to be silently blocked. This adds permissive delete policies consistent
  with the existing select/update policies on each table.

  1. campaigns - allow DELETE (matches existing open select/update policies)
  2. simulation_results - allow DELETE (matches existing open select/update policies)
*/

CREATE POLICY "Campaigns delete"
  ON campaigns
  FOR DELETE
  USING (true);

CREATE POLICY "Simulation results delete"
  ON simulation_results
  FOR DELETE
  USING (true);
