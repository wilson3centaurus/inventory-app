import { apiError, requireApiUser } from "@/lib/supabase-admin";
import { loadWorkspace } from "@/lib/workspace-data";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await loadWorkspace(user.id));
  } catch (error) {
    return apiError(error);
  }
}
