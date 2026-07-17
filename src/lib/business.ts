import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Business = {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  gst_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  quotation_prefix: string;
  next_quotation_number: number;
  signature_url: string | null;
};

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // rare: trigger not fired; create manually
        const { data: created, error: e2 } = await supabase
          .from("businesses")
          .insert({ owner_id: user.id, name: "My Business", email: user.email })
          .select()
          .single();
        if (e2) throw e2;
        return created as Business;
      }
      return data as Business;
    },
  });
}
